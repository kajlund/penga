import { lockLedgerHistory } from '../domain/ledger-history.js';
import {
  createOpeningBalance,
  OpeningBalanceError,
  validOpeningDate,
} from '../domain/opening-balances.js';
import { Hono } from 'hono';
import { eq, and, isNull, asc, sql } from 'drizzle-orm';
import {
  db,
  accounts,
  splits,
  templateSplits,
  transactionTemplates,
  budgets,
  type Account,
} from '../db/index.js';
import {
  AccountType,
  type AccountTreeNode,
  type CreateAccountInput,
} from '@penga/shared';

export const accountsRoute = new Hono();

accountsRoute.onError((err, c) => {
  if (err instanceof OpeningBalanceError)
    return c.json({ error: err.message }, 409);
  console.error('Account operation failed', err);
  return c.json(
    { error: 'Unable to save or delete the account. Please try again.' },
    500,
  );
});
function openingInputError(body: CreateAccountInput) {
  if (
    body.initialBalanceCents !== undefined &&
    (!Number.isInteger(body.initialBalanceCents) ||
      Math.abs(body.initialBalanceCents) > 2147483647)
  )
    return 'Opening balance must be an integer amount of cents within the supported range.';
  if (body.initialBalanceCents && !validOpeningDate(body.initialBalanceDate))
    return 'Choose a valid opening-balance date in YYYY-MM-DD format.';
  return null;
}
const validAccountTypes = new Set<string>(Object.values(AccountType));

/**
 * Builds a hierarchical tree from a flat list of accounts in O(N) time,
 * sorted alphabetically by name at every level.
 */
export function buildAccountTree(allAccounts: Account[]): AccountTreeNode[] {
  const nodeMap = new Map<string, AccountTreeNode>();
  const rootNodes: AccountTreeNode[] = [];

  for (const acc of allAccounts) {
    nodeMap.set(acc.id, {
      id: acc.id,
      name: acc.name,
      description: acc.description,
      type: acc.type as AccountType,
      parentId: acc.parentId,
      icon: acc.icon,
      color: acc.color,
      createdAt: acc.createdAt,
      updatedAt: acc.updatedAt,
      children: [],
    });
  }

  for (const acc of allAccounts) {
    const node = nodeMap.get(acc.id)!;
    if (acc.parentId && nodeMap.has(acc.parentId)) {
      nodeMap.get(acc.parentId)!.children.push(node);
    } else {
      rootNodes.push(node);
    }
  }

  const sortNodes = (nodes: AccountTreeNode[]) => {
    nodes.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
    for (const n of nodes) {
      if (n.children && n.children.length > 0) {
        sortNodes(n.children);
      }
    }
  };
  sortNodes(rootNodes);

  return rootNodes;
}

/**
 * Checks if targetAncestorId is an ancestor of potentialDescendantId.
 */
async function wouldCreateCycle(
  targetId: string,
  newParentId: string,
): Promise<boolean> {
  if (targetId === newParentId) {
    return true;
  }

  let currentId: string | null = newParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === targetId) {
      return true;
    }
    visited.add(currentId);

    const [row] = await db
      .select({ parentId: accounts.parentId })
      .from(accounts)
      .where(eq(accounts.id, currentId))
      .limit(1);

    if (!row || !row.parentId || visited.has(row.parentId)) {
      break;
    }
    currentId = row.parentId;
  }

  return false;
}

/**
 * GET /api/accounts/tree
 * Returns accounts organized as a hierarchical tree.
 */
accountsRoute.get('/tree', async (c) => {
  const allAccounts = await db
    .select()
    .from(accounts)
    .orderBy(asc(accounts.name));
  const tree = buildAccountTree(allAccounts);
  return c.json({ data: tree });
});

/**
 * GET /api/accounts
 * Returns flat list of accounts with optional type and parentId filters.
 */
accountsRoute.get('/', async (c) => {
  const typeQuery = c.req.query('type')?.toUpperCase();
  const parentQuery = c.req.query('parentId');

  const query = db.select().from(accounts);

  const conditions = [];

  if (typeQuery && validAccountTypes.has(typeQuery)) {
    conditions.push(eq(accounts.type, typeQuery as AccountType));
  }

  if (parentQuery !== undefined) {
    if (parentQuery === 'null' || parentQuery === '') {
      conditions.push(isNull(accounts.parentId));
    } else {
      conditions.push(eq(accounts.parentId, parentQuery));
    }
  }

  const results =
    conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(asc(accounts.name))
      : await query.orderBy(asc(accounts.name));

  return c.json({ data: results });
});

/**
 * GET /api/accounts/:id
 * Returns a single account by ID.
 */
accountsRoute.get('/:id', async (c) => {
  const id = c.req.param('id');
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, id))
    .limit(1);

  if (!account) {
    return c.json({ error: 'Account not found' }, 404);
  }

  return c.json({ data: account });
});

/**
 * POST /api/accounts
 * Creates a new account.
 */
accountsRoute.post('/', async (c) => {
  let body: CreateAccountInput;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400);
  }

  const {
    name,
    description,
    type,
    parentId,
    icon,
    color,
    initialBalanceCents,
  } = body as CreateAccountInput;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return c.json(
      { error: 'Field "name" is required and must be a non-empty string' },
      400,
    );
  }

  const normalizedType = typeof type === 'string' ? type.toUpperCase() : '';
  if (!validAccountTypes.has(normalizedType)) {
    return c.json(
      {
        error: `Field "type" must be one of: ${Array.from(validAccountTypes).join(', ')}`,
      },
      400,
    );
  }

  // If parentId is supplied, verify it exists
  if (parentId) {
    const [parent] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.id, parentId))
      .limit(1);

    if (!parent) {
      return c.json(
        { error: `Parent account with id "${parentId}" does not exist` },
        400,
      );
    }
  }

  if (body.initialBalanceDate === undefined)
    body.initialBalanceDate = new Date().toLocaleDateString('en-CA');
  const openingError = openingInputError(body);
  if (openingError) return c.json({ error: openingError }, 400);
  if (
    initialBalanceCents &&
    !['ASSET', 'LIABILITY', 'SETTLEMENT'].includes(normalizedType)
  )
    return c.json(
      { error: 'This account type cannot have an opening balance.' },
      400,
    );
  const created = await db.transaction(async (tx) => {
    await lockLedgerHistory(tx);
    const [acc] = await tx
      .insert(accounts)
      .values({
        name: name.trim(),
        description:
          typeof description === 'string' && description.trim()
            ? description.trim()
            : null,
        type: normalizedType as AccountType,
        parentId: parentId || null,
        icon: typeof icon === 'string' && icon.trim() ? icon.trim() : null,
        color: typeof color === 'string' && color.trim() ? color.trim() : null,
      })
      .returning();

    // If an initial balance was specified for an ASSET, LIABILITY, or SETTLEMENT account, record an opening balance transaction
    if (
      typeof initialBalanceCents === 'number' &&
      initialBalanceCents !== 0 &&
      (normalizedType === 'ASSET' ||
        normalizedType === 'LIABILITY' ||
        normalizedType === 'SETTLEMENT')
    ) {
      await createOpeningBalance(
        tx,
        acc,
        initialBalanceCents!,
        body.initialBalanceDate!,
      );
    }

    return acc;
  });

  return c.json({ data: created }, 201);
});

/**
 * PATCH /api/accounts/:id
 * Updates an existing account with cycle prevention.
 */
accountsRoute.patch('/:id', async (c) => {
  const id = c.req.param('id');

  const [existing] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, id))
    .limit(1);
  if (!existing) {
    return c.json({ error: 'Account not found' }, 404);
  }

  let body: CreateAccountInput;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400);
  }

  const updateValues: Partial<typeof accounts.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      return c.json({ error: 'Field "name" cannot be empty' }, 400);
    }
    updateValues.name = body.name.trim();
  }

  if (body.description !== undefined) {
    updateValues.description =
      typeof body.description === 'string' && body.description.trim()
        ? body.description.trim()
        : null;
  }

  if (body.type !== undefined) {
    const normalizedType =
      typeof body.type === 'string' ? body.type.toUpperCase() : '';
    if (!validAccountTypes.has(normalizedType)) {
      return c.json(
        {
          error: `Field "type" must be one of: ${Array.from(validAccountTypes).join(', ')}`,
        },
        400,
      );
    }

    if (existing.type !== normalizedType) {
      const [splitExists] = await db
        .select({ id: splits.id })
        .from(splits)
        .where(eq(splits.accountId, id))
        .limit(1);

      if (
        splitExists &&
        (existing.type === 'SETTLEMENT' || normalizedType === 'SETTLEMENT')
      ) {
        return c.json(
          {
            error: `Cannot change the type of account "${existing.name}" to or from Settlement because it has transactions. Its existing entries rely on the current account type. Keep this type or create a separate account with the required type.`,
          },
          409,
        );
      }
    }

    updateValues.type = normalizedType as AccountType;
  }

  if (body.parentId !== undefined) {
    const newParentId = body.parentId;

    if (newParentId !== null && newParentId !== '') {
      // Validate parent exists
      const [parent] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.id, newParentId))
        .limit(1);

      if (!parent) {
        return c.json(
          { error: `Parent account with id "${newParentId}" does not exist` },
          400,
        );
      }

      // Check cycle
      const isCycle = await wouldCreateCycle(id, newParentId);
      if (isCycle) {
        return c.json(
          {
            error: `Cannot move account "${existing.name}" under itself or one of its sub-accounts. Choose a parent outside this account's own hierarchy.`,
          },
          400,
        );
      }

      updateValues.parentId = newParentId;
    } else {
      updateValues.parentId = null;
    }
  }

  if (body.icon !== undefined) {
    updateValues.icon =
      typeof body.icon === 'string' && body.icon.trim()
        ? body.icon.trim()
        : null;
  }

  if (body.color !== undefined) {
    updateValues.color =
      typeof body.color === 'string' && body.color.trim()
        ? body.color.trim()
        : null;
  }

  const openingError = openingInputError(body);
  if (openingError) return c.json({ error: openingError }, 400);
  const updated = await db.transaction(async (tx) => {
    await lockLedgerHistory(tx);
    if (
      updateValues.type &&
      updateValues.type !== existing.type &&
      (existing.type === 'EQUITY' ||
        !['ASSET', 'LIABILITY', 'SETTLEMENT'].includes(updateValues.type))
    ) {
      const rows = await tx.execute(
        sql`SELECT 1 FROM splits s JOIN transactions t ON t.id=s.transaction_id WHERE s.account_id=${id} AND (t.payee='Opening Balance' OR t.note LIKE 'Starting balance for %') LIMIT 1`,
      );
      if (rows.length)
        throw new OpeningBalanceError(
          `Cannot change the type of account "${existing.name}" because it is part of an opening balance. Edit or delete the related opening balance in Transactions first. Keep the equity counterpart as Equity while any opening balances use it.`,
        );
    }
    const [account] = await tx
      .update(accounts)
      .set(updateValues)
      .where(eq(accounts.id, id))
      .returning();
    if (body.initialBalanceCents)
      await createOpeningBalance(
        tx,
        account,
        body.initialBalanceCents,
        body.initialBalanceDate!,
      );
    return account;
  });

  return c.json({ data: updated });
});

/**
 * DELETE /api/accounts/:id
 * Deletes an account.
 */
accountsRoute.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const result = await db.transaction(async (tx) => {
    await lockLedgerHistory(tx);
    const [existing] = await tx
      .select()
      .from(accounts)
      .where(eq(accounts.id, id))
      .for('update');
    if (!existing) return { error: 'Account not found', status: 404 as const };
    const reasons: string[] = [];
    const [history] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(splits)
      .where(eq(splits.accountId, id));
    if (history.count)
      reasons.push(
        'It still has transactions. Review its entries in Transactions and remove or reassign them first; cleared transactions require reversal rather than ordinary deletion.',
      );

    const templates = await tx
      .selectDistinct({
        name: transactionTemplates.name,
        id: transactionTemplates.id,
      })
      .from(templateSplits)
      .innerJoin(
        transactionTemplates,
        eq(templateSplits.templateId, transactionTemplates.id),
      )
      .where(eq(templateSplits.accountId, id))
      .orderBy(asc(transactionTemplates.name));
    if (templates.length) {
      const names = templates
        .slice(0, 3)
        .map((template) => '"' + template.name + '"')
        .join(', ');
      const extra =
        templates.length > 3 ? ' and ' + (templates.length - 3) + ' more' : '';
      reasons.push(
        'It is used by saved transaction templates: ' +
          names +
          extra +
          '. Open Templates and change the account in those templates or delete the templates. Clearing transactions keeps saved templates.',
      );
    }

    const [budget] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(budgets)
      .where(eq(budgets.accountId, id));
    if (budget.count)
      reasons.push(
        'It has ' +
          budget.count +
          ' budget(s). Open Budgets and remove or reassign those budgets. Clearing transactions keeps budgets.',
      );
    const children = await tx
      .select({ name: accounts.name })
      .from(accounts)
      .where(eq(accounts.parentId, id))
      .orderBy(asc(accounts.name));
    if (children.length)
      reasons.push(
        'It has sub-accounts: ' +
          children
            .slice(0, 3)
            .map((child) => '"' + child.name + '"')
            .join(', ') +
          (children.length > 3
            ? ' and ' + (children.length - 3) + ' more'
            : '') +
          '. Move those sub-accounts to another parent or delete them individually first.',
      );
    if (reasons.length)
      return {
        error:
          'Cannot delete account "' + existing.name + '". ' + reasons.join(' '),
        status: 409 as const,
      };
    await tx.delete(accounts).where(eq(accounts.id, id));
    return { success: true };
  });
  if ('error' in result) return c.json({ error: result.error }, result.status);
  return c.json({ success: true, deletedId: id });
});
