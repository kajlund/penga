import { Hono } from 'hono';
import { eq, desc, asc, inArray, and } from 'drizzle-orm';
import { db, transactions, splits, accounts, tags, transactionTags } from '../db/index.js';
import type { CreateTransactionInput, SplitInput, UpdateTransactionInput, ReorderTransactionsInput } from '@penga/shared';

export const transactionsRoute = new Hono();

/**
 * POST /api/transactions
 * Creates a transaction with balanced double-entry splits and optional tags.
 */
transactionsRoute.post('/', async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400);
  }

  const { transactionDate, sortOrder, payee, isCleared, note, splits: inputSplits, tagIds } = body as CreateTransactionInput;

  // 1. Validate transaction date (YYYY-MM-DD)
  if (!transactionDate || typeof transactionDate !== 'string') {
    return c.json({ error: 'Field "transactionDate" is required and must be a string (YYYY-MM-DD)' }, 400);
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(transactionDate) || isNaN(Date.parse(transactionDate))) {
    return c.json({ error: 'Field "transactionDate" must be a valid date in YYYY-MM-DD format' }, 400);
  }

  // 2. Validate splits array existence and length
  if (!Array.isArray(inputSplits) || inputSplits.length < 2) {
    return c.json({ error: 'Transaction must have at least 2 split lines to balance' }, 400);
  }

  // 3. Validate each split
  let totalCents = 0;
  const referencedAccountIds = new Set<string>();

  for (let i = 0; i < inputSplits.length; i++) {
    const split = inputSplits[i];
    if (!split || typeof split !== 'object') {
      return c.json({ error: `Split at index ${i} is invalid` }, 400);
    }

    if (!split.accountId || typeof split.accountId !== 'string') {
      return c.json({ error: `Split at index ${i} is missing a valid "accountId"` }, 400);
    }

    if (!Number.isInteger(split.amountCents)) {
      return c.json({ error: `Split at index ${i} "amountCents" must be an integer` }, 400);
    }

    if (split.amountCents === 0) {
      return c.json({ error: `Split at index ${i} "amountCents" cannot be zero` }, 400);
    }

    totalCents += split.amountCents;
    referencedAccountIds.add(split.accountId);
  }

  // 4. CRITICAL: Validate double-entry sum equals precisely zero
  if (totalCents !== 0) {
    return c.json(
      {
        error: `Transaction splits must balance to exactly zero. Current net sum: ${totalCents} cents`,
        imbalanceCents: totalCents,
      },
      400
    );
  }

  // 5. Validate that all referenced account IDs exist in PostgreSQL
  const foundAccounts = await db
    .select({ id: accounts.id, name: accounts.name, type: accounts.type, icon: accounts.icon, color: accounts.color })
    .from(accounts)
    .where(inArray(accounts.id, Array.from(referencedAccountIds)));

  if (foundAccounts.length !== referencedAccountIds.size) {
    const foundIds = new Set(foundAccounts.map((a) => a.id));
    const missingIds = Array.from(referencedAccountIds).filter((id) => !foundIds.has(id));
    return c.json({ error: `The following accountId(s) do not exist: ${missingIds.join(', ')}` }, 400);
  }

  const accountMap = new Map(foundAccounts.map((a) => [a.id, a]));

  // 6. Execute atomic transaction in PostgreSQL
  const result = await db.transaction(async (tx) => {
    const [newTx] = await tx
      .insert(transactions)
      .values({
        transactionDate,
        sortOrder: typeof sortOrder === 'number' && Number.isInteger(sortOrder) ? sortOrder : 0,
        payee: typeof payee === 'string' && payee.trim() ? payee.trim() : null,
        isCleared: Boolean(isCleared),
        note: typeof note === 'string' && note.trim() ? note.trim() : null,
      })
      .returning();

    const splitsToInsert = inputSplits.map((s) => ({
      transactionId: newTx.id,
      accountId: s.accountId,
      amountCents: s.amountCents,
    }));

    const insertedSplits = await tx.insert(splits).values(splitsToInsert).returning();

    const enrichedSplits = insertedSplits.map((s) => {
      const acc = accountMap.get(s.accountId);
      return {
        ...s,
        accountName: acc?.name,
        accountType: acc?.type,
        accountIcon: acc?.icon,
        accountColor: acc?.color,
      };
    });

    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      for (const tagId of tagIds) {
        await tx.insert(transactionTags).values({
          transactionId: newTx.id,
          tagId,
        }).onConflictDoNothing();
      }
    }

    const attachedTags = tagIds && tagIds.length > 0
      ? await tx
          .select({ id: tags.id, name: tags.name, color: tags.color })
          .from(tags)
          .where(inArray(tags.id, tagIds))
          .orderBy(asc(tags.name))
      : [];

    return {
      ...newTx,
      splits: enrichedSplits,
      tags: attachedTags,
    };
  });

  return c.json({ data: result }, 201);
});

/**
 * GET /api/transactions
 * Lists transactions with their nested splits, tags, and account details.
 */
transactionsRoute.get('/', async (c) => {
  const accountId = c.req.query('accountId');
  const isClearedQuery = c.req.query('isCleared');
  const tagQuery = c.req.query('tagId') || c.req.query('tag');
  const limit = Math.min(Math.max(Number(c.req.query('limit')) || 50, 1), 100);
  const offset = Math.max(Number(c.req.query('offset')) || 0, 0);

  // If filtering by account, find transaction IDs first
  let txIdFilter: string[] | null = null;
  if (accountId) {
    const matchedSplits = await db
      .select({ transactionId: splits.transactionId })
      .from(splits)
      .where(eq(splits.accountId, accountId));

    if (matchedSplits.length === 0) {
      return c.json({ data: [] });
    }
    txIdFilter = Array.from(new Set(matchedSplits.map((s) => s.transactionId)));
  }

  // If filtering by tag, find transaction IDs
  let tagTxIdFilter: string[] | null = null;
  if (tagQuery) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tagQuery);
    const matchedTags = isUuid
      ? await db
          .select({ transactionId: transactionTags.transactionId })
          .from(transactionTags)
          .where(eq(transactionTags.tagId, tagQuery))
      : await db
          .select({ transactionId: transactionTags.transactionId })
          .from(transactionTags)
          .innerJoin(tags, eq(transactionTags.tagId, tags.id))
          .where(eq(tags.name, tagQuery.replace(/^#+/, '').toLowerCase()));

    if (matchedTags.length === 0) {
      return c.json({ data: [] });
    }
    tagTxIdFilter = Array.from(new Set(matchedTags.map((r) => r.transactionId)));
  }

  let finalTxIdFilter: string[] | null = null;
  if (txIdFilter && tagTxIdFilter) {
    const tagSet = new Set(tagTxIdFilter);
    finalTxIdFilter = txIdFilter.filter((id) => tagSet.has(id));
    if (finalTxIdFilter.length === 0) {
      return c.json({ data: [] });
    }
  } else if (txIdFilter) {
    finalTxIdFilter = txIdFilter;
  } else if (tagTxIdFilter) {
    finalTxIdFilter = tagTxIdFilter;
  }

  const conditions = [];
  if (finalTxIdFilter) {
    conditions.push(inArray(transactions.id, finalTxIdFilter));
  }
  if (isClearedQuery !== undefined) {
    conditions.push(eq(transactions.isCleared, isClearedQuery === 'true'));
  }

  const txRows = conditions.length > 0
    ? await db
        .select()
        .from(transactions)
        .where(and(...conditions))
        .orderBy(desc(transactions.transactionDate), asc(transactions.sortOrder), desc(transactions.createdAt))
        .limit(limit)
        .offset(offset)
    : await db
        .select()
        .from(transactions)
        .orderBy(desc(transactions.transactionDate), asc(transactions.sortOrder), desc(transactions.createdAt))
        .limit(limit)
        .offset(offset);

  if (txRows.length === 0) {
    return c.json({ data: [] });
  }

  // Fetch splits for all returned transactions
  const txIds = txRows.map((t) => t.id);
  const splitRows = await db
    .select({
      id: splits.id,
      transactionId: splits.transactionId,
      accountId: splits.accountId,
      amountCents: splits.amountCents,
      createdAt: splits.createdAt,
      accountName: accounts.name,
      accountType: accounts.type,
      accountIcon: accounts.icon,
      accountColor: accounts.color,
    })
    .from(splits)
    .innerJoin(accounts, eq(splits.accountId, accounts.id))
    .where(inArray(splits.transactionId, txIds));

  // Group splits by transactionId
  const splitMap = new Map<string, any[]>();
  for (const s of splitRows) {
    const list = splitMap.get(s.transactionId) || [];
    list.push(s);
    splitMap.set(s.transactionId, list);
  }

  // Fetch tags for all returned transactions
  const tagRows = await db
    .select({
      transactionId: transactionTags.transactionId,
      id: tags.id,
      name: tags.name,
      color: tags.color,
    })
    .from(transactionTags)
    .innerJoin(tags, eq(transactionTags.tagId, tags.id))
    .where(inArray(transactionTags.transactionId, txIds))
    .orderBy(asc(tags.name));

  const tagMap = new Map<string, any[]>();
  for (const tr of tagRows) {
    const list = tagMap.get(tr.transactionId) || [];
    list.push({ id: tr.id, name: tr.name, color: tr.color });
    tagMap.set(tr.transactionId, list);
  }

  const data = txRows.map((t) => ({
    ...t,
    splits: splitMap.get(t.id) || [],
    tags: tagMap.get(t.id) || [],
  }));

  return c.json({ data });
});

/**
 * GET /api/transactions/:id
 * Fetches a single transaction with its splits and tags.
 */
transactionsRoute.get('/:id', async (c) => {
  const id = c.req.param('id');

  const [tx] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  if (!tx) {
    return c.json({ error: 'Transaction not found' }, 404);
  }

  const splitRows = await db
    .select({
      id: splits.id,
      transactionId: splits.transactionId,
      accountId: splits.accountId,
      amountCents: splits.amountCents,
      createdAt: splits.createdAt,
      accountName: accounts.name,
      accountType: accounts.type,
      accountIcon: accounts.icon,
      accountColor: accounts.color,
    })
    .from(splits)
    .innerJoin(accounts, eq(splits.accountId, accounts.id))
    .where(eq(splits.transactionId, id));

  const tagRows = await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
    })
    .from(transactionTags)
    .innerJoin(tags, eq(transactionTags.tagId, tags.id))
    .where(eq(transactionTags.transactionId, id))
    .orderBy(asc(tags.name));

  return c.json({
    data: {
      ...tx,
      splits: splitRows,
      tags: tagRows,
    },
  });
});

/**
 * PATCH /api/transactions/reorder
 * Batch updates the sortOrder for multiple transactions.
 */
transactionsRoute.patch('/reorder', async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400);
  }

  const { items } = body as ReorderTransactionsInput;
  if (!Array.isArray(items) || items.length === 0) {
    return c.json({ error: 'Field "items" must be a non-empty array of { id, sortOrder }' }, 400);
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.id || typeof item.id !== 'string') {
      return c.json({ error: `Item at index ${i} missing valid "id"` }, 400);
    }
    if (!Number.isInteger(item.sortOrder)) {
      return c.json({ error: `Item at index ${i} "sortOrder" must be an integer` }, 400);
    }
  }

  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx
        .update(transactions)
        .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
        .where(eq(transactions.id, item.id));
    }
  });

  return c.json({ success: true, updatedCount: items.length });
});

/**
 * PATCH /api/transactions/:id
 * Partially updates a transaction (isCleared toggle, sortOrder, payee, note, transactionDate).
 */
transactionsRoute.patch('/:id', async (c) => {
  const id = c.req.param('id');
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400);
  }

  const [existing] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  if (!existing) {
    return c.json({ error: 'Transaction not found' }, 404);
  }

  const updateData: Partial<typeof transactions.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (body.isCleared !== undefined) {
    updateData.isCleared = Boolean(body.isCleared);
  }

  if (body.sortOrder !== undefined) {
    if (!Number.isInteger(body.sortOrder)) {
      return c.json({ error: 'Field "sortOrder" must be an integer' }, 400);
    }
    updateData.sortOrder = body.sortOrder;
  }

  if (body.payee !== undefined) {
    updateData.payee = typeof body.payee === 'string' && body.payee.trim() ? body.payee.trim() : null;
  }

  if (body.note !== undefined) {
    updateData.note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null;
  }

  if (body.transactionDate !== undefined) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (
      typeof body.transactionDate !== 'string' ||
      !dateRegex.test(body.transactionDate) ||
      isNaN(Date.parse(body.transactionDate))
    ) {
      return c.json({ error: 'Field "transactionDate" must be a valid date in YYYY-MM-DD format' }, 400);
    }
    updateData.transactionDate = body.transactionDate;
  }

  // Validate splits if provided
  if (body.splits !== undefined) {
    if (!Array.isArray(body.splits) || body.splits.length < 2) {
      return c.json({ error: 'Transaction must have at least 2 split lines to balance' }, 400);
    }

    let totalCents = 0;
    const referencedAccountIds = new Set<string>();

    for (let i = 0; i < body.splits.length; i++) {
      const split = body.splits[i];
      if (!split || typeof split !== 'object') {
        return c.json({ error: `Split at index ${i} is invalid` }, 400);
      }

      if (!split.accountId || typeof split.accountId !== 'string') {
        return c.json({ error: `Split at index ${i} is missing a valid "accountId"` }, 400);
      }

      if (!Number.isInteger(split.amountCents)) {
        return c.json({ error: `Split at index ${i} "amountCents" must be an integer` }, 400);
      }

      if (split.amountCents === 0) {
        return c.json({ error: `Split at index ${i} "amountCents" cannot be zero` }, 400);
      }

      totalCents += split.amountCents;
      referencedAccountIds.add(split.accountId);
    }

    if (totalCents !== 0) {
      return c.json(
        {
          error: `Transaction splits must balance to exactly zero. Current net sum: ${totalCents} cents`,
          imbalanceCents: totalCents,
        },
        400
      );
    }

    const foundAccounts = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(inArray(accounts.id, Array.from(referencedAccountIds)));

    if (foundAccounts.length !== referencedAccountIds.size) {
      const foundIds = new Set(foundAccounts.map((a) => a.id));
      const missingIds = Array.from(referencedAccountIds).filter((accId) => !foundIds.has(accId));
      return c.json({ error: `The following accountId(s) do not exist: ${missingIds.join(', ')}` }, 400);
    }
  }

  const updated = await db.transaction(async (tx) => {
    const [updatedTx] = await tx
      .update(transactions)
      .set(updateData)
      .where(eq(transactions.id, id))
      .returning();

    if (body.splits !== undefined) {
      // Delete existing splits
      await tx.delete(splits).where(eq(splits.transactionId, id));

      // Insert new splits
      await tx.insert(splits).values(
        body.splits.map((s: SplitInput) => ({
          transactionId: id,
          accountId: s.accountId,
          amountCents: s.amountCents,
        }))
      );
    }

    if (body.tagIds !== undefined) {
      // Delete existing tag associations
      await tx.delete(transactionTags).where(eq(transactionTags.transactionId, id));

      // Insert new tag associations
      if (Array.isArray(body.tagIds) && body.tagIds.length > 0) {
        for (const tagId of body.tagIds) {
          await tx.insert(transactionTags).values({
            transactionId: id,
            tagId,
          }).onConflictDoNothing();
        }
      }
    }

    return updatedTx;
  });

  const splitRows = await db
    .select({
      id: splits.id,
      transactionId: splits.transactionId,
      accountId: splits.accountId,
      amountCents: splits.amountCents,
      createdAt: splits.createdAt,
      accountName: accounts.name,
      accountType: accounts.type,
      accountIcon: accounts.icon,
      accountColor: accounts.color,
    })
    .from(splits)
    .innerJoin(accounts, eq(splits.accountId, accounts.id))
    .where(eq(splits.transactionId, id));

  const tagRows = await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
    })
    .from(transactionTags)
    .innerJoin(tags, eq(transactionTags.tagId, tags.id))
    .where(eq(transactionTags.transactionId, id))
    .orderBy(asc(tags.name));

  return c.json({
    data: {
      ...updated,
      splits: splitRows,
      tags: tagRows,
    },
  });
});

/**
 * DELETE /api/transactions/:id
 * Deletes a transaction (splits cascade delete).
 */
transactionsRoute.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [existing] = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  if (!existing) {
    return c.json({ error: 'Transaction not found' }, 404);
  }

  await db.delete(transactions).where(eq(transactions.id, id));

  return c.json({
    success: true,
    deletedId: id,
    message: 'Transaction deleted successfully',
  });
});
