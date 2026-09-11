import { Hono } from 'hono';
import { eq, and, sql, gte, lte, desc, asc, isNull } from 'drizzle-orm';
import { db, budgets, accounts, splits, transactions } from '../db/index.js';
import type {
  MonthlyBudgetReport,
  BudgetProgressItem,
  SetBudgetInput,
} from '@penga/shared';

export const budgetsRoute = new Hono();

/**
 * Helper to get days in a month (1-indexed month)
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Format month number to 2 digits
 */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * GET /api/budgets
 * Computes monthly actual spending, run-rate projections, rolling averages (3-mo, 12-mo), and target progress.
 */
budgetsRoute.get('/', async (c) => {
  const now = new Date();
  const year = Number(c.req.query('year')) || now.getFullYear();
  const month = Number(c.req.query('month')) || now.getMonth() + 1;

  if (month < 1 || month > 12) {
    return c.json({ error: 'Month must be between 1 and 12' }, 400);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const daysElapsed = isCurrentMonth ? Math.min(now.getDate(), daysInMonth) : daysInMonth;

  // 1. Fetch all expense accounts
  const expenseAccounts = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      icon: accounts.icon,
      color: accounts.color,
    })
    .from(accounts)
    .where(eq(accounts.type, 'EXPENSE'))
    .orderBy(asc(accounts.name));

  // 2. Fetch all budgets
  const budgetRows = await db.select().from(budgets);

  // Map budgets by accountId: prefer month-specific, fallback to evergreen (null year/month)
  const budgetMap = new Map<string, typeof budgets.$inferSelect>();
  for (const b of budgetRows) {
    if (b.periodYear === year && b.periodMonth === month) {
      budgetMap.set(b.accountId, b);
    } else if (!b.periodYear && !b.periodMonth && !budgetMap.has(b.accountId)) {
      budgetMap.set(b.accountId, b);
    }
  }

  // 3. Fetch all splits joined with transaction date
  const splitRows = await db
    .select({
      accountId: splits.accountId,
      amountCents: splits.amountCents,
      transactionDate: transactions.transactionDate,
    })
    .from(splits)
    .innerJoin(transactions, eq(splits.transactionId, transactions.id));

  // Calculate actuals and historical monthly sums per account
  // Key: accountId -> Map<"YYYY-MM", sumCents>
  const accountMonthlyHistory = new Map<string, Map<string, number>>();

  for (const s of splitRows) {
    if (!s.transactionDate) continue;
    const yyyyMm = s.transactionDate.substring(0, 7);
    let monthMap = accountMonthlyHistory.get(s.accountId);
    if (!monthMap) {
      monthMap = new Map<string, number>();
      accountMonthlyHistory.set(s.accountId, monthMap);
    }
    monthMap.set(yyyyMm, (monthMap.get(yyyyMm) || 0) + Math.abs(s.amountCents));
  }

  // Helper to compute prior months keys
  function getPriorMonthKeys(count: number): string[] {
    const keys: string[] = [];
    for (let i = 1; i <= count; i++) {
      const d = new Date(year, month - 1 - i, 1);
      const ym = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
      keys.push(ym);
    }
    return keys;
  }

  const prior3MonthKeys = getPriorMonthKeys(3);
  const prior12MonthKeys = getPriorMonthKeys(12);
  const activeMonthKey = `${year}-${pad2(month)}`;

  let totalBudgetedCents = 0;
  let totalSpentCents = 0;

  const items: BudgetProgressItem[] = expenseAccounts.map((acc) => {
    const b = budgetMap.get(acc.id);
    const targetAmountCents = b?.targetAmountCents || 0;

    const history = accountMonthlyHistory.get(acc.id) || new Map<string, number>();
    const actualSpentCents = history.get(activeMonthKey) || 0;

    // Projected Month-End Run-Rate
    const projectedMonthEndCents =
      daysElapsed > 0
        ? Math.round((actualSpentCents / daysElapsed) * daysInMonth)
        : actualSpentCents;

    // 3-Month Rolling Average
    let sum3 = 0;
    let count3 = 0;
    for (const k of prior3MonthKeys) {
      if (history.has(k)) {
        sum3 += history.get(k)!;
        count3++;
      }
    }
    const rolling3MonthAvgCents = count3 > 0 ? Math.round(sum3 / count3) : actualSpentCents;

    // 12-Month Rolling Average
    let sum12 = 0;
    let count12 = 0;
    for (const k of prior12MonthKeys) {
      if (history.has(k)) {
        sum12 += history.get(k)!;
        count12++;
      }
    }
    const rolling12MonthAvgCents = count12 > 0 ? Math.round(sum12 / count12) : rolling3MonthAvgCents;

    // Suggested Adaptive Target:
    // Blend 3-month momentum (60%) with 12-month baseline (40%), rounded to clean dollars
    let suggested = 0;
    if (rolling3MonthAvgCents > 0 || rolling12MonthAvgCents > 0) {
      const blended = (rolling3MonthAvgCents * 0.6) + (rolling12MonthAvgCents * 0.4);
      suggested = Math.max(Math.ceil(blended / 1000) * 1000, 1000); // rounded to nearest $10
    } else if (projectedMonthEndCents > 0) {
      suggested = Math.ceil(projectedMonthEndCents / 1000) * 1000;
    }

    const remainingCents = targetAmountCents - actualSpentCents;
    const progressPercent =
      targetAmountCents > 0
        ? Math.round((actualSpentCents / targetAmountCents) * 100)
        : actualSpentCents > 0
        ? 100
        : 0;

    totalBudgetedCents += targetAmountCents;
    totalSpentCents += actualSpentCents;

    return {
      budgetId: b?.id || null,
      accountId: acc.id,
      accountName: acc.name,
      accountIcon: acc.icon,
      accountColor: acc.color,
      targetAmountCents,
      actualSpentCents,
      remainingCents,
      progressPercent,
      projectedMonthEndCents,
      rolling3MonthAvgCents,
      rolling12MonthAvgCents,
      suggestedTargetCents: suggested,
      notes: b?.notes || null,
    };
  });

  const totalRemainingCents = totalBudgetedCents - totalSpentCents;
  const overallProgressPercent =
    totalBudgetedCents > 0
      ? Math.round((totalSpentCents / totalBudgetedCents) * 100)
      : 0;

  const report: MonthlyBudgetReport = {
    year,
    month,
    totalBudgetedCents,
    totalSpentCents,
    totalRemainingCents,
    overallProgressPercent,
    items,
  };

  return c.json({ data: report });
});

/**
 * POST /api/budgets
 * Sets or updates a budget target for an account.
 */
budgetsRoute.post('/', async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400);
  }

  const { accountId, targetAmountCents, periodYear, periodMonth, notes } = body as SetBudgetInput;

  if (!accountId || typeof accountId !== 'string') {
    return c.json({ error: 'Field "accountId" is required' }, 400);
  }

  if (!Number.isInteger(targetAmountCents) || targetAmountCents < 0) {
    return c.json({ error: 'Field "targetAmountCents" must be a non-negative integer' }, 400);
  }

  // Check that account exists
  const [acc] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
  if (!acc) {
    return c.json({ error: 'Account not found' }, 404);
  }

  // Check if a budget already exists for this account & period
  const conditions = [eq(budgets.accountId, accountId)];
  if (periodYear && periodMonth) {
    conditions.push(eq(budgets.periodYear, periodYear), eq(budgets.periodMonth, periodMonth));
  } else {
    conditions.push(isNull(budgets.periodYear), isNull(budgets.periodMonth));
  }

  const [existing] = await db.select().from(budgets).where(and(...conditions)).limit(1);

  let result;
  if (existing) {
    const [updated] = await db
      .update(budgets)
      .set({
        targetAmountCents,
        notes: typeof notes === 'string' ? notes.trim() : existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(budgets.id, existing.id))
      .returning();
    result = updated;
  } else {
    const [inserted] = await db
      .insert(budgets)
      .values({
        accountId,
        targetAmountCents,
        periodYear: periodYear || null,
        periodMonth: periodMonth || null,
        notes: typeof notes === 'string' ? notes.trim() : null,
      })
      .returning();
    result = inserted;
  }

  return c.json({ success: true, data: result });
});

/**
 * DELETE /api/budgets/:id
 * Deletes a budget target.
 */
budgetsRoute.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const [existing] = await db.select().from(budgets).where(eq(budgets.id, id)).limit(1);
  if (!existing) {
    return c.json({ error: 'Budget not found' }, 404);
  }

  await db.delete(budgets).where(eq(budgets.id, id));
  return c.json({ success: true, deletedId: id });
});
