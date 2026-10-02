import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db, transactions, splits, transactionTags } from '../db/index.js';

type LedgerTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const RESET_CONFIRMATION = 'DELETE ALL TRANSACTIONS';

/** Same lock order for all ledger writers. PostgreSQL also blocks direct SQL writers. */
export async function lockLedgerHistory(tx: LedgerTransaction) {
  await tx.execute(sql`LOCK TABLE transactions, splits, transaction_tags IN SHARE ROW EXCLUSIVE MODE`);
}

// Hash every persisted history row and its PostgreSQL row version, not just counts or dates.
// Locks keep the three queries coherent; xmin also detects edits that restore previous values.
async function summarize(tx: LedgerTransaction) {
  const rows = await tx.execute(sql`
    SELECT 'transactions' AS kind, to_jsonb(t)::text AS content, xmin::text AS version FROM transactions t
    UNION ALL SELECT 'splits', to_jsonb(s)::text, xmin::text FROM splits s
    UNION ALL SELECT 'transactionTags', to_jsonb(tt)::text, xmin::text FROM transaction_tags tt
    ORDER BY kind, content, version
  `);
  const counts = { transactions: 0, splits: 0, transactionTags: 0 };
  const hash = createHash('sha256');
  for (const row of rows) {
    counts[row.kind as keyof typeof counts]++;
    hash.update(JSON.stringify([row.kind, row.content, row.version]));
  }
  return { ...counts, revision: hash.digest('hex') };
}

export class StaleLedgerError extends Error {}

export async function ledgerHistorySummary() {
  return db.transaction(async tx => {
    await lockLedgerHistory(tx);
    return summarize(tx);
  });
}

/** Dedicated reset exception; ordinary delete/void protections remain in place. */
export async function clearLedgerHistory(confirmation: unknown, revision: unknown) {
  if (confirmation !== RESET_CONFIRMATION || typeof revision !== 'string' || !/^[a-f0-9]{64}$/.test(revision)) {
    throw new TypeError('Enter DELETE ALL TRANSACTIONS and load a fresh summary before clearing.');
  }
  return db.transaction(async tx => {
    await lockLedgerHistory(tx);
    const current = await summarize(tx);
    if (current.revision !== revision) {
      throw new StaleLedgerError('Transaction history changed. Refresh the summary and confirm again.');
    }
    // Explicit dependency order; reusable tags and templates are never deleted.
    const links = await tx.delete(transactionTags).returning({ id: transactionTags.transactionId });
    const lines = await tx.delete(splits).returning({ id: splits.id });
    const records = await tx.delete(transactions).returning({ id: transactions.id });
    return { transactions: records.length, splits: lines.length, transactionTags: links.length };
  });
}
