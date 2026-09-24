import type { Account, SplitInput, CreateTransactionInput } from './index.js';

export const APP_CURRENCY = 'EUR'; // The ledger currently has no per-account currency model.
export const formatMoney = (cents: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: APP_CURRENCY }).format(cents / 100);

export type SettlementDirection = 'owed-to-user' | 'settled' | 'owed-by-user';

export interface SettlementPresentation {
  direction: SettlementDirection;
  amountCents: number;
  label: string;
}

export function getSettlementPresentation(balanceCents: number): SettlementPresentation {
  const abs = Math.abs(balanceCents);
  if (balanceCents > 0) {
    return {
      direction: 'owed-to-user',
      amountCents: abs,
      label: `Owed to you ${formatMoney(abs)}`,
    };
  }
  if (balanceCents < 0) {
    return {
      direction: 'owed-by-user',
      amountCents: abs,
      label: `You owe ${formatMoney(abs)}`,
    };
  }
  return {
    direction: 'settled',
    amountCents: 0,
    label: 'Settled',
  };
}
export function parseMoney(value: string): number {
  let text = value.trim();
  if (text.includes(',') && text.includes('.')) {
    text = text.lastIndexOf(',') > text.lastIndexOf('.') ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
  } else text = text.replace(',', '.');
  if (!/^[+-]?\d+(?:\.\d{1,2})?$/.test(text)) return NaN;
  const cents = Math.round(Number(text) * 100);
  return Number.isSafeInteger(cents) && Math.abs(cents) <= 2147483647 ? cents : NaN;
}
export interface EntryRow { id: string; accountId: string; amount: string }
export type TransactionEntry =
  | { kind: 'expense' | 'income'; accountId: string; total: string; rows: EntryRow[] }
  | { kind: 'transfer'; accountId: string; toAccountId: string; total: string }
  | { kind: 'adjustment'; accountId: string; method: 'balance' | 'amount'; total: string }
  | { kind: 'advanced'; rows: EntryRow[] };
export type EntryKind = TransactionEntry['kind'];
export const newRow = (): EntryRow => ({ id: crypto.randomUUID(), accountId: '', amount: '' });
export function newEntry(kind: EntryKind = 'expense'): TransactionEntry {
  if (kind === 'advanced') return { kind, rows: [newRow(), newRow()] };
  if (kind === 'transfer') return { kind, accountId: '', toAccountId: '', total: '' };
  if (kind === 'adjustment') return { kind, accountId: '', method: 'amount', total: '' };
  return { kind, accountId: '', total: '', rows: [newRow()] };
}
export const isBalanceAccount = (account: Account) => account.type === 'ASSET' || account.type === 'LIABILITY' || account.type === 'SETTLEMENT';
export function allocationSummary(entry: TransactionEntry) {
  const total = 'total' in entry ? parseMoney(entry.total) || 0 : 0;
  const allocated = 'rows' in entry ? entry.rows.reduce((sum, row) => sum + (parseMoney(row.amount) || 0), 0) : total;
  return { total, allocated, remaining: total - allocated };
}
export function useRemaining(entry: TransactionEntry, id: string): TransactionEntry {
  if (!('rows' in entry)) return entry;
  const { remaining } = allocationSummary(entry);
  return { ...entry, rows: entry.rows.map(row => row.id === id ? { ...row, amount: (((parseMoney(row.amount) || 0) + remaining) / 100).toFixed(2) } : row) };
}
export interface EntryContext { accounts: Account[]; currentBalanceCents?: number; equityAccountId?: string }
export function entrySplits(entry: TransactionEntry, context: EntryContext): SplitInput[] {
  if (entry.kind === 'advanced') return entry.rows.map(row => ({ accountId: row.accountId, amountCents: parseMoney(row.amount) }));
  const amount = parseMoney(entry.total);
  if (entry.kind === 'transfer') return [{ accountId: entry.accountId, amountCents: -amount }, { accountId: entry.toAccountId, amountCents: amount }];
  if (entry.kind === 'adjustment') {
    // Match the existing ledger's signed balances, including negative liability balances.
    const delta = entry.method === 'balance' ? amount - (context.currentBalanceCents ?? NaN) : amount;
    return [{ accountId: entry.accountId, amountCents: delta }, { accountId: context.equityAccountId || '', amountCents: -delta }];
  }
  const direction = entry.kind === 'expense' ? 1 : -1;
  return [{ accountId: entry.accountId, amountCents: -direction * amount }, ...entry.rows.map(row => ({ accountId: row.accountId, amountCents: direction * parseMoney(row.amount) }))];
}
export function entryErrors(entry: TransactionEntry, context: EntryContext, date: string, payee: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) errors.date = 'Choose a valid date.';
  if ((entry.kind === 'expense' || entry.kind === 'income') && !payee.trim()) errors.payee = entry.kind === 'expense' ? 'Enter a payee.' : 'Enter a payer/source.';
  if ('accountId' in entry && !context.accounts.some(a => a.id === entry.accountId && isBalanceAccount(a))) errors.account = 'Choose an asset, liability, or settlement account.';
  if ('total' in entry && (!Number.isFinite(parseMoney(entry.total)) || (entry.kind !== 'adjustment' && parseMoney(entry.total) <= 0))) errors.total = 'Enter a valid amount' + (entry.kind === 'adjustment' ? '.' : ' greater than zero.');
  if (entry.kind === 'transfer' && (!context.accounts.some(a => a.id === entry.toAccountId && isBalanceAccount(a)) || entry.accountId === entry.toAccountId)) errors.destination = 'Choose a different asset, liability, or settlement account.';
  if ('rows' in entry) {
    if (entry.rows.length < (entry.kind === 'advanced' ? 2 : 1)) errors.rows = 'Add an allocation.';
    entry.rows.forEach(row => {
      if (!context.accounts.some(a => a.id === row.accountId) || ('accountId' in entry && row.accountId === entry.accountId)) errors[`account-${row.id}`] = 'Choose a different account/category.';
      const value = parseMoney(row.amount);
      if (!Number.isFinite(value) || value === 0 || (entry.kind !== 'advanced' && value < 0)) errors[`amount-${row.id}`] = entry.kind === 'advanced' ? 'Enter a non-zero amount.' : 'Enter an amount greater than zero.';
    });
  }
  if (entry.kind === 'adjustment' && entry.method === 'balance' && context.currentBalanceCents === undefined) errors.total = 'Wait for the current balance to load.';
  const lines = entrySplits(entry, context);
  if (lines.some(s => !Number.isSafeInteger(s.amountCents) || Math.abs(s.amountCents) > 2147483647)) errors.balance = 'Enter valid amounts within the ledger limit.';
  else if (lines.reduce((sum, s) => sum + s.amountCents, 0) !== 0) errors.balance = 'Allocate the total exactly before recording.';
  else if (entry.kind === 'adjustment' && lines[0].amountCents === 0) errors.total = 'The adjustment must change the balance.';
  return errors;
}
export function buildEntryTransaction(entry: TransactionEntry, context: EntryContext, details: Omit<CreateTransactionInput, 'splits'>): CreateTransactionInput {
  const errors = entryErrors(entry, context, details.transactionDate, details.payee || '');
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const lines = entrySplits(entry, context);
  if (lines.some(s => !s.accountId)) throw new Error('Opening Balances equity account is required.');
  return { ...details, splits: lines };
}
export function entryFromSplits(splits: SplitInput[], accounts: Account[]): TransactionEntry {
  const rows = splits.map(s => ({ id: crypto.randomUUID(), accountId: s.accountId, amount: (s.amountCents / 100).toFixed(2) }));
  const advanced: TransactionEntry = { kind: 'advanced', rows };
  if (splits.length < 2 || splits.some(s => s.amountCents === 0 || !accounts.some(a => a.id === s.accountId)) || splits.reduce((n, s) => n + s.amountCents, 0) !== 0) return advanced;
  if (splits.some(s => accounts.find(a => a.id === s.accountId)?.type === 'EQUITY')) return advanced;
  const negative = splits.filter(s => s.amountCents < 0), positive = splits.filter(s => s.amountCents > 0);
  const balance = (id: string) => accounts.some(a => a.id === id && isBalanceAccount(a));
  if (splits.length === 2 && splits[0].accountId !== splits[1].accountId && splits.every(s => balance(s.accountId))) return { kind: 'transfer', accountId: negative[0].accountId, toAccountId: positive[0].accountId, total: (positive[0].amountCents / 100).toFixed(2) };
  for (const kind of ['expense', 'income'] as const) {
    const source = kind === 'expense' ? negative : positive;
    const allocations = kind === 'expense' ? positive : negative;
    if (source.length === 1 && balance(source[0].accountId) && allocations.every(s => s.accountId !== source[0].accountId)) return { kind, accountId: source[0].accountId, total: (Math.abs(source[0].amountCents) / 100).toFixed(2), rows: allocations.map(s => ({ id: crypto.randomUUID(), accountId: s.accountId, amount: (Math.abs(s.amountCents) / 100).toFixed(2) })) };
  }
  return advanced;
}
