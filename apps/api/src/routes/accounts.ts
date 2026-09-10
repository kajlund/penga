import { Hono } from 'hono';
import { eq, and, isNull } from 'drizzle-orm';
import { db, accounts, type Account } from '../db/index.js';
import { AccountType, type AccountTreeNode } from '@penga/shared';

export const accountsRoute = new Hono();

const validAccountTypes = new Set<string>(Object.values(AccountType));

/**
 * Builds a hierarchical tree from a flat list of accounts in O(N) time.
 */
export function buildAccountTree(allAccounts: Account[]): AccountTreeNode[] {
  const nodeMap = new Map<string, AccountTreeNode>();
  const rootNodes: AccountTreeNode[] = [];

  for (const acc of allAccounts) {
    nodeMap.set(acc.id, {
      id: acc.id,
      name: acc.name,
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

  return rootNodes;
}

/**
 * Checks if targetAncestorId is an ancestor of potentialDescendantId.
 */
async function wouldCreateCycle(targetId: string, newParentId: string): Promise<boolean> {
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
  const allAccounts = await db.select().from(accounts);
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

  let query = db.select().from(accounts);

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

  const results = conditions.length > 0
    ? await query.where(and(...conditions))
    : await query;

  return c.json({ data: results });
});

/**
 * GET /api/accounts/:id
 * Returns a single account by ID.
 */
accountsRoute.get('/:id', async (c) => {
  const id = c.req.param('id');
  const [account] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);

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
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400);
  }

  const { name, type, parentId, icon, color } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return c.json({ error: 'Field "name" is required and must be a non-empty string' }, 400);
  }

  const normalizedType = typeof type === 'string' ? type.toUpperCase() : '';
  if (!validAccountTypes.has(normalizedType)) {
    return c.json(
      {
        error: `Field "type" must be one of: ${Array.from(validAccountTypes).join(', ')}`,
      },
      400
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
      return c.json({ error: `Parent account with id "${parentId}" does not exist` }, 400);
    }
  }

  const [created] = await db
    .insert(accounts)
    .values({
      name: name.trim(),
      type: normalizedType as AccountType,
      parentId: parentId || null,
      icon: typeof icon === 'string' && icon.trim() ? icon.trim() : null,
      color: typeof color === 'string' && color.trim() ? color.trim() : null,
    })
    .returning();

  return c.json({ data: created }, 201);
});

/**
 * PATCH /api/accounts/:id
 * Updates an existing account with cycle prevention.
 */
accountsRoute.patch('/:id', async (c) => {
  const id = c.req.param('id');

  const [existing] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  if (!existing) {
    return c.json({ error: 'Account not found' }, 404);
  }

  let body: any;
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

  if (body.type !== undefined) {
    const normalizedType = typeof body.type === 'string' ? body.type.toUpperCase() : '';
    if (!validAccountTypes.has(normalizedType)) {
      return c.json(
        {
          error: `Field "type" must be one of: ${Array.from(validAccountTypes).join(', ')}`,
        },
        400
      );
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
        return c.json({ error: `Parent account with id "${newParentId}" does not exist` }, 400);
      }

      // Check cycle
      const isCycle = await wouldCreateCycle(id, newParentId);
      if (isCycle) {
        return c.json(
          {
            error: 'Cannot set parent: would create a circular dependency in the account tree',
          },
          400
        );
      }

      updateValues.parentId = newParentId;
    } else {
      updateValues.parentId = null;
    }
  }

  if (body.icon !== undefined) {
    updateValues.icon = typeof body.icon === 'string' && body.icon.trim() ? body.icon.trim() : null;
  }

  if (body.color !== undefined) {
    updateValues.color = typeof body.color === 'string' && body.color.trim() ? body.color.trim() : null;
  }

  const [updated] = await db
    .update(accounts)
    .set(updateValues)
    .where(eq(accounts.id, id))
    .returning();

  return c.json({ data: updated });
});

/**
 * DELETE /api/accounts/:id
 * Deletes an account.
 */
accountsRoute.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [existing] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  if (!existing) {
    return c.json({ error: 'Account not found' }, 404);
  }

  await db.delete(accounts).where(eq(accounts.id, id));

  return c.json({
    success: true,
    deletedId: id,
    message: `Account "${existing.name}" deleted successfully`,
  });
});
