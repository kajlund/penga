import { Hono } from 'hono';
import { eq, desc, asc, inArray } from 'drizzle-orm';
import { db, transactions, splits, accounts, tags, transactionTags } from '../db/index.js';
import type { DashboardSummary, AccountBalanceSummary, TransactionWithSplits } from '@penga/shared';

export const reportsRoute = new Hono();

/**
 * GET /api/reports/balance-summary
 * GET /api/dashboard/summary
 * Returns aggregated liquidity, assets vs liabilities, account balance rollups, and recent activity.
 */
reportsRoute.get('/balance-summary', async (c) => {
  return handleSummary(c);
});

reportsRoute.get('/summary', async (c) => {
  return handleSummary(c);
});

reportsRoute.get('/', async (c) => {
  return handleSummary(c);
});

async function handleSummary(c: any) {
  // 1. Fetch all accounts
  const allAccounts = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      parentId: accounts.parentId,
      icon: accounts.icon,
      color: accounts.color,
      createdAt: accounts.createdAt,
      updatedAt: accounts.updatedAt,
    })
    .from(accounts)
    .orderBy(asc(accounts.name));

  // 2. Fetch all splits joined with transaction cleared status
  const splitRows = await db
    .select({
      id: splits.id,
      accountId: splits.accountId,
      amountCents: splits.amountCents,
      isCleared: transactions.isCleared,
    })
    .from(splits)
    .leftJoin(transactions, eq(splits.transactionId, transactions.id));

  // 3. Compute direct balances per account
  const directBalances = new Map<string, number>();
  const clearedBalances = new Map<string, number>();
  const splitCounts = new Map<string, number>();

  for (const s of splitRows) {
    const accId = s.accountId;
    directBalances.set(accId, (directBalances.get(accId) || 0) + s.amountCents);
    splitCounts.set(accId, (splitCounts.get(accId) || 0) + 1);
    if (s.isCleared) {
      clearedBalances.set(accId, (clearedBalances.get(accId) || 0) + s.amountCents);
    }
  }

  // 4. Build parent -> children map for hierarchical rollup
  const childrenMap = new Map<string, string[]>();
  for (const acc of allAccounts) {
    if (acc.parentId) {
      const list = childrenMap.get(acc.parentId) || [];
      list.push(acc.id);
      childrenMap.set(acc.parentId, list);
    }
  }

  // Memoized rollup calculation
  const rollupCache = new Map<string, number>();
  function calculateRollup(accId: string, visited = new Set<string>()): number {
    if (rollupCache.has(accId)) return rollupCache.get(accId)!;
    if (visited.has(accId)) return directBalances.get(accId) || 0; // prevent cycle recursion if any
    visited.add(accId);

    const direct = directBalances.get(accId) || 0;
    const children = childrenMap.get(accId) || [];
    let childSum = 0;
    for (const childId of children) {
      childSum += calculateRollup(childId, new Set(visited));
    }

    const total = direct + childSum;
    rollupCache.set(accId, total);
    return total;
  }

  // 5. Build AccountBalanceSummary list and calculate grand totals
  let totalAssetsCents = 0;
  let totalLiabilitiesCents = 0;
  let totalIncomeCents = 0;
  let totalExpensesCents = 0;

  const accountSummaries: AccountBalanceSummary[] = allAccounts.map((acc) => {
    const directBal = directBalances.get(acc.id) || 0;
    const clearedBal = clearedBalances.get(acc.id) || 0;
    const count = splitCounts.get(acc.id) || 0;
    const rollupBal = calculateRollup(acc.id);

    // Aggregate category totals using direct balances to avoid double counting
    if (acc.type === 'ASSET') {
      totalAssetsCents += directBal;
    } else if (acc.type === 'LIABILITY') {
      // In double-entry, liability accounts with negative balances represent obligations
      totalLiabilitiesCents += Math.abs(directBal);
    } else if (acc.type === 'INCOME') {
      // Income entries can be signed; track absolute inflow
      totalIncomeCents += Math.abs(directBal);
    } else if (acc.type === 'EXPENSE') {
      // Expense splits are positive debits
      totalExpensesCents += Math.abs(directBal);
    }

    return {
      id: acc.id,
      name: acc.name,
      type: acc.type,
      parentId: acc.parentId,
      icon: acc.icon,
      color: acc.color,
      balanceCents: directBal,
      clearedBalanceCents: clearedBal,
      splitCount: count,
      rollupBalanceCents: rollupBal,
    };
  });

  const netAvailableCents = totalAssetsCents - totalLiabilitiesCents;

  // 6. Fetch 6 most recent transactions with splits
  const recentTxs = await db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.transactionDate), asc(transactions.sortOrder), desc(transactions.createdAt))
    .limit(6);

  let recentTransactionsWithSplits: TransactionWithSplits[] = [];

  if (recentTxs.length > 0) {
    const txIds = recentTxs.map((t) => t.id);
    const recentSplitRows = await db
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

    const recentSplitMap = new Map<string, any[]>();
    for (const s of recentSplitRows) {
      const list = recentSplitMap.get(s.transactionId) || [];
      list.push(s);
      recentSplitMap.set(s.transactionId, list);
    }

    const recentTagRows = await db
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

    const recentTagMap = new Map<string, any[]>();
    for (const tr of recentTagRows) {
      const list = recentTagMap.get(tr.transactionId) || [];
      list.push({ id: tr.id, name: tr.name, color: tr.color });
      recentTagMap.set(tr.transactionId, list);
    }

    recentTransactionsWithSplits = recentTxs.map((t) => ({
      ...t,
      splits: recentSplitMap.get(t.id) || [],
      tags: recentTagMap.get(t.id) || [],
    }));
  }

  const summary: DashboardSummary = {
    totalAssetsCents,
    totalLiabilitiesCents,
    netAvailableCents,
    totalIncomeCents,
    totalExpensesCents,
    accountBalances: accountSummaries,
    recentTransactions: recentTransactionsWithSplits,
  };

  return c.json({ data: summary });
}
