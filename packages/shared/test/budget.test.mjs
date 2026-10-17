import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  monthlyBudgetReport,
  shiftMonth,
  budgetUsage,
  formatMoney,
} from '../dist/index.js';
const account = (id, parentId = null, type = 'EXPENSE') => ({
  id,
  name: id,
  parentId,
  type,
  icon: null,
  color: null,
});
const budget = (accountId, targetAmountCents, extra = {}) => ({
  id: 'b-' + accountId,
  accountId,
  targetAmountCents,
  notes: 'keep note',
  ...extra,
});
const entry = (
  accountId,
  amountCents,
  transactionDate = '2026-10-01',
  extra = {},
) => ({ accountId, amountCents, transactionDate, ...extra });
const report = (
  accounts,
  budgets,
  entries,
  month = 10,
  start = null,
  today = '2026-10-14',
) => monthlyBudgetReport(accounts, budgets, entries, 2026, month, today, start);
test('nested hierarchy counts each expense once including direct parent postings; legacy target preserved', () => {
  const r = report(
    [
      account('Z'),
      account('Parent'),
      account('Child', 'Parent'),
      account('Nested', 'Child'),
      account('Bank', null, 'ASSET'),
    ],
    [budget('Parent', 99999), budget('Nested', 1000)],
    [
      entry('Parent', 100),
      entry('Child', 200),
      entry('Nested', 300),
      entry('Z', 400),
      entry('Bank', 5000),
    ],
  );
  assert.deepEqual(
    r.items.map((n) => n.name),
    ['Parent', 'Z'],
  );
  const p = r.items[0];
  assert.equal(p.actualCents, 600);
  assert.equal(p.targetCents, 1000);
  assert.equal(p.excludedParentTargetCents, 99999);
  assert.equal(p.savedBudget.notes, 'keep note');
  assert.equal(r.totals.actualCents, 1000);
  assert.equal(r.totals.targetCents, 1000);
  assert.equal(r.totals.budgetedSpentCents, 300);
  assert.equal(r.totals.unbudgetedSpentCents, 700);
  assert.equal(r.totals.remainingCents, 700);
});
test('partial coverage uses only budgeted spending for remaining and usage', () => {
  const r = report(
    [account('Group'), account('Food', 'Group'), account('Travel', 'Group')],
    [budget('Food', 1000)],
    [entry('Food', 1200), entry('Travel', 900)],
  );
  const p = r.items[0];
  assert.equal(p.usagePercent, 120);
  assert.equal(p.remainingCents, -200);
  assert.equal(p.unbudgetedSpentCents, 900);
  assert.equal(p.actualCents, 2100);
  assert.equal(p.unbudgetedCount, 1);
});
test('no target is distinct from explicit zero and negative net spending has no misleading usage', () => {
  const r = report(
    [account('None'), account('Zero'), account('Refund')],
    [budget('Zero', 0), budget('Refund', 100)],
    [entry('None', 100), entry('Zero', 50), entry('Refund', -300)],
  );
  const none = r.items.find((i) => i.name === 'None'),
    zero = r.items.find((i) => i.name === 'Zero'),
    refund = r.items.find((i) => i.name === 'Refund');
  assert.equal(none.remainingCents, null);
  assert.equal(none.usagePercent, null);
  assert.equal(zero.remainingCents, -50);
  assert.equal(zero.budgetedCount, 1);
  assert.equal(zero.usagePercent, null);
  assert.equal(refund.remainingCents, 400);
  assert.equal(refund.usagePercent, null);
  assert.equal(budgetUsage(0, 0), null);
});
test('signed split expenses and refunds, reversal and void exclusion; non-expenses and opening balances excluded', () => {
  const r = report(
    [account('Food'), account('Other'), account('Bank', null, 'ASSET')],
    [],
    [
      entry('Food', 500),
      entry('Other', 200),
      entry('Food', -100),
      entry('Food', 300, '2026-10-02', { voidedAt: '2026-10-03' }),
      entry('Food', -300),
      entry('Bank', -700),
      entry('Food', 1000, '2026-10-01', { payee: 'Opening Balance' }),
    ],
  );
  assert.equal(r.totals.actualCents, 300);
  assert.equal(r.items.find((i) => i.name === 'Food').actualCents, 100);
});
test('calendar month boundaries and projection to date exclude future-dated current-month entries', () => {
  const r = report(
    [account('Food')],
    [],
    [
      entry('Food', 100, '2026-09-30'),
      entry('Food', 1400, '2026-10-01'),
      entry('Food', 1000, '2026-10-31'),
      entry('Food', 100, '2026-11-01'),
    ],
  );
  assert.equal(r.items[0].actualCents, 2400);
  assert.equal(r.items[0].projectedMonthEndCents, 3100);
  assert.equal(
    report([account('Food')], [], [], 9).items[0].projectedMonthEndCents,
    null,
  );
  assert.equal(
    report([account('Food')], [], [], 11).items[0].projectedMonthEndCents,
    null,
  );
  assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
  assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
});
test('history requires explicit coverage, skips partial first month, counts covered zero months', () => {
  const entries = [
    entry('Food', 600, '2026-08-01'),
    entry('Food', 100, '2026-10-01'),
  ];
  const accounts = [account('Food')];
  const none = report(accounts, [], entries).items[0];
  assert.equal(none.rolling3MonthAvgCents, null);
  assert.equal(none.sample3, 0);
  const partial = report(accounts, [], entries, 10, '2026-08-15').items[0];
  assert.equal(partial.sample3, 1);
  assert.equal(partial.rolling3MonthAvgCents, 0);
  const full = report(accounts, [], entries, 10, '2026-08-01').items[0];
  assert.equal(full.sample3, 2);
  assert.equal(full.sample12, 2);
  assert.equal(full.rolling3MonthAvgCents, 300);
  const first = report(accounts, [], entries, 10, '2026-10-01').items[0];
  assert.equal(first.sample3, 0);
});
test('averages include only completed months, even when selected month is in the future', () => {
  const node = report(
    [account('Food')],
    [],
    [entry('Food', 600, '2026-09-01'), entry('Food', 99999, '2026-10-01')],
    11,
    '2026-09-01',
  ).items[0];
  assert.equal(node.sample3, 1);
  assert.equal(node.rolling3MonthAvgCents, 600);
});
test('existing month override takes precedence; a null target override does not fall back to recurring', () => {
  const r = report(
    [account('Food')],
    [
      budget('Food', 1000),
      budget('Food', 0, { id: 'specific', periodYear: 2026, periodMonth: 10 }),
    ],
    [],
  );
  assert.equal(r.items[0].targetCents, 0);
  assert.equal(r.items[0].savedBudget.id, 'specific');
  assert.equal(r.items[0].budgetedCount, 1);
  const removed = report(
    [account('Food')],
    [
      budget('Food', 1000),
      budget('Food', null, { periodYear: 2026, periodMonth: 10 }),
    ],
    [],
  );
  assert.equal(removed.items[0].budgetedCount, 0);
});
test('budget currency uses established EUR locale formatting', () => {
  assert.equal(formatMoney(123456), '€1,234.56');
  assert.equal(formatMoney(-123), '-€1.23');
  assert.equal(formatMoney(0), '€0.00');
});
