import { and, eq, sql } from 'drizzle-orm';
import { accounts, db, transactions, splits } from '../db/index.js';
type LedgerTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Shared by account creation and later corrections. No income/expense offset. */
export async function openingBalanceAccount(tx: LedgerTransaction) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(7291031)`);
  const [existing] = await tx.select().from(accounts)
    .where(and(eq(accounts.name, 'Opening Balances'), eq(accounts.type, 'EQUITY'))).limit(1);
  if (existing) return existing;
  const [created] = await tx.insert(accounts).values({ name: 'Opening Balances', type: 'EQUITY',
    icon: '\u2696\ufe0f', color: '#8b5cf6', description: 'Equity account for starting balances and capital adjustments' }).returning();
  return created;
}

export function validOpeningDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function isOpeningBalance(tx: { payee: string | null; note: string | null }) {
  return tx.payee === 'Opening Balance' || Boolean(typeof tx.note === 'string' && tx.note.startsWith('Starting balance for '));
}
export class OpeningBalanceError extends Error {}
/** Caller holds the ledger lock; identification follows the legacy ledger model. */
export async function createOpeningBalance(tx: LedgerTransaction, account: typeof accounts.$inferSelect, amount: number, date: string) {
  if (!['ASSET', 'LIABILITY', 'SETTLEMENT'].includes(account.type)) throw new OpeningBalanceError('Opening balances require an asset, liability or settlement account.');
  const previous = await tx.select({ payee: transactions.payee, note: transactions.note })
    .from(transactions).innerJoin(splits, eq(splits.transactionId, transactions.id)).where(eq(splits.accountId, account.id));
  if (previous.some(isOpeningBalance)) throw new OpeningBalanceError('This account already has an opening balance. Edit or delete it in Transactions first.');
  const equity = await openingBalanceAccount(tx);
  const [record] = await tx.insert(transactions).values({ transactionDate: date, sortOrder: -2147483648,
    payee: 'Opening Balance', note: 'Starting balance for ' + account.name, isCleared: true }).returning();
  await tx.insert(splits).values([{ transactionId: record.id, accountId: account.id, amountCents: amount },
    { transactionId: record.id, accountId: equity.id, amountCents: -amount }]);
}
