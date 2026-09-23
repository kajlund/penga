import { and, eq, sql } from 'drizzle-orm';
import { accounts, db } from '../db/index.js';
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
