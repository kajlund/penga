import { buildHierarchy } from './account-tree.js';
import type { Account, Budget } from './index.js';
export interface BudgetTotals {
  targetCents: number;
  actualCents: number;
  budgetedSpentCents: number;
  unbudgetedSpentCents: number;
  budgetedCount: number;
  unbudgetedCount: number;
  remainingCents: number | null;
  usagePercent: number | null;
}
export interface BudgetNode extends BudgetTotals {
  accountId: string;
  name: string;
  icon: string | null;
  children: BudgetNode[];
  directActualCents: number;
  savedBudget: Budget | null;
  excludedParentTargetCents: number | null;
  projectedMonthEndCents: number | null;
  rolling3MonthAvgCents: number | null;
  rolling12MonthAvgCents: number | null;
  sample3: number;
  sample12: number;
}
export interface HierarchicalBudgetReport {
  year: number;
  month: number;
  trackingStartDate: string | null;
  items: BudgetNode[];
  totals: BudgetTotals;
}
export interface ExpenseEntry {
  accountId: string;
  amountCents: number;
  transactionDate: string;
  voidedAt?: string | Date | null;
  payee?: string | null;
  note?: string | null;
}
export function monthKey(year: number, month: number) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}
export function shiftMonth(year: number, month: number, delta: number) {
  const index = year * 12 + month - 1 + delta;
  return {
    year: Math.floor(index / 12),
    month: (((index % 12) + 12) % 12) + 1,
  };
}
export function budgetUsage(
  target: number | null,
  actual: number,
): number | null {
  return target !== null && target > 0 && actual >= 0
    ? Math.round((actual / target) * 100)
    : null;
}
function totals(nodes: BudgetTotals[]): BudgetTotals {
  const result = {
    targetCents: 0,
    actualCents: 0,
    budgetedSpentCents: 0,
    unbudgetedSpentCents: 0,
    budgetedCount: 0,
    unbudgetedCount: 0,
    remainingCents: null as number | null,
    usagePercent: null as number | null,
  };
  for (const node of nodes) {
    result.targetCents += node.targetCents;
    result.actualCents += node.actualCents;
    result.budgetedSpentCents += node.budgetedSpentCents;
    result.unbudgetedSpentCents += node.unbudgetedSpentCents;
    result.budgetedCount += node.budgetedCount;
    result.unbudgetedCount += node.unbudgetedCount;
  }
  result.remainingCents = result.budgetedCount
    ? result.targetCents - result.budgetedSpentCents
    : null;
  result.usagePercent = budgetUsage(
    result.budgetedCount ? result.targetCents : null,
    result.budgetedSpentCents,
  );
  return result;
}
/** Each expense split belongs to exactly one direct account; totals sum disjoint subtrees. */
export function monthlyBudgetReport(
  accountRows: Account[],
  budgetRows: Budget[],
  entries: ExpenseEntry[],
  year: number,
  month: number,
  today: string,
  trackingStartDate: string | null,
): HierarchicalBudgetReport {
  const expense = accountRows.filter((a) => a.type === 'EXPENSE');
  const ids = new Set(expense.map((a) => a.id));
  const histories = new Map<string, Map<string, number>>();
  const toDate = new Map<string, number>();
  for (const e of entries) {
    if (
      !ids.has(e.accountId) ||
      e.voidedAt ||
      e.payee === 'Opening Balance' ||
      e.note?.startsWith('Starting balance for ')
    )
      continue;
    const key = e.transactionDate.slice(0, 7);
    const history = histories.get(e.accountId) ?? new Map<string, number>();
    history.set(key, (history.get(key) ?? 0) + e.amountCents);
    histories.set(e.accountId, history);
    if (key === today.slice(0, 7) && e.transactionDate <= today)
      toDate.set(e.accountId, (toDate.get(e.accountId) ?? 0) + e.amountCents);
  }
  const active = monthKey(year, month);
  const keys = (count: number) =>
    Array.from({ length: count }, (_, i) => {
      const d = shiftMonth(year, month, -i - 1);
      return monthKey(d.year, d.month);
    }).filter(
      (key) =>
        trackingStartDate &&
        key + '-01' >= trackingStartDate &&
        key < today.slice(0, 7),
    );
  const prior3 = keys(3),
    prior12 = keys(12);
  const isCurrent = active === today.slice(0, 7);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  type Tree = Account & { children: Tree[] };
  const make = (account: Tree): BudgetNode => {
    const children = account.children.map(make);
    const candidates = budgetRows.filter((b) => b.accountId === account.id);
    const saved =
      candidates.find(
        (b) => b.periodYear === year && b.periodMonth === month,
      ) ??
      candidates.find((b) => b.periodYear == null && b.periodMonth == null) ??
      null;
    const target = children.length ? null : (saved?.targetAmountCents ?? null);
    const actual = histories.get(account.id)?.get(active) ?? 0;
    const direct: BudgetTotals = {
      targetCents: target ?? 0,
      actualCents: actual,
      budgetedSpentCents: target === null ? 0 : actual,
      unbudgetedSpentCents: target === null ? actual : 0,
      budgetedCount: target === null ? 0 : 1,
      unbudgetedCount: target === null ? 1 : 0,
      remainingCents: null,
      usagePercent: null,
    };
    // A group without direct postings does not itself reduce coverage.
    if (children.length && !histories.get(account.id)?.has(active))
      direct.unbudgetedCount = 0;
    const sum = totals([direct, ...children]);
    const subtreeIds = (node: Tree): string[] => [
      node.id,
      ...node.children.flatMap(subtreeIds),
    ];
    const members = subtreeIds(account);
    const average = (months: string[]) =>
      months.length
        ? Math.round(
            months.reduce(
              (n, k) =>
                n +
                members.reduce(
                  (m, id) => m + (histories.get(id)?.get(k) ?? 0),
                  0,
                ),
              0,
            ) / months.length,
          )
        : null;
    return {
      ...sum,
      accountId: account.id,
      name: account.name,
      icon: account.icon,
      children,
      directActualCents: actual,
      savedBudget: saved,
      excludedParentTargetCents: children.length
        ? (saved?.targetAmountCents ?? null)
        : null,
      projectedMonthEndCents: isCurrent
        ? Math.round(
            (members.reduce((n, id) => n + (toDate.get(id) ?? 0), 0) * days) /
              Number(today.slice(8, 10)),
          )
        : null,
      rolling3MonthAvgCents: average(prior3),
      rolling12MonthAvgCents: average(prior12),
      sample3: prior3.length,
      sample12: prior12.length,
    };
  };
  const items = (buildHierarchy(expense) as Tree[]).map(make);
  return { year, month, trackingStartDate, items, totals: totals(items) };
}
