import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

// Never run a reset on the configured database. Create a separate database first,
// then import the application's connection only after DATABASE_URL points at it.
test('clear history in a newly created isolated PostgreSQL database', {
  skip: process.env.PENGA_RESET_DATABASE_TESTS !== '1',
}, async t => {
  dotenv.config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
  const url = new URL(process.env.DATABASE_URL);
  const databaseName = `penga_reset_test_${randomUUID().replaceAll('-', '')}`;
  const admin = postgres(url.toString(), { max: 1 });
  let queryClient;
  let created = false;
  try {
    await admin`CREATE DATABASE ${admin(databaseName)}`;
    created = true;
    url.pathname = `/${databaseName}`;
    process.env.DATABASE_URL = url.toString();
    const connection = await import('../dist/db/index.js');
    queryClient = connection.queryClient;
    assert.equal((await queryClient`SELECT current_database() AS name`)[0].name, databaseName);
    await migrate(drizzle(queryClient), { migrationsFolder: fileURLToPath(new URL('../drizzle/', import.meta.url)) });
    const { db, accounts, transactions, splits, tags, budgets, transactionTemplates, templateSplits, templateTags } = connection;
    const { sql, eq } = await import('drizzle-orm');
    const { accountsRoute } = await import('../dist/routes/accounts.js');
    const { transactionsRoute } = await import('../dist/routes/transactions.js');
    const { reportsRoute } = await import('../dist/routes/reports.js');
    const { dataManagementRoute: route } = await import('../dist/routes/data-management.js');
    const { lockLedgerHistory } = await import('../dist/domain/ledger-history.js');
    const post = (route, path, body) => route.request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const summary = async () => {
      const res = await route.request('/transactions/summary');
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('cache-control'), 'no-store');
      return (await res.json()).data;
    };
    const clear = revision => post(route, '/transactions/clear', { confirmation: 'DELETE ALL TRANSACTIONS', revision });
    const createAccount = async (name, type, initialBalanceCents = 0) => {
      const res = await post(accountsRoute, '/', { name, type, initialBalanceCents });
      assert.equal(res.status, 201);
      return (await res.json()).data;
    };
    const bank = await createAccount('Bank', 'ASSET', 10000);
    const cash = await createAccount('Cash', 'ASSET');
    const expense = await createAccount('Food', 'EXPENSE');
    const settlement = await createAccount('Shared expenses', 'SETTLEMENT');
    const [tag] = await db.insert(tags).values({ name: 'keep', color: '#123456' }).returning();
    await db.insert(budgets).values({ accountId: expense.id, targetAmountCents: 5000, periodYear: 2026 });
    const [template] = await db.insert(transactionTemplates).values({ name: 'Keep template' }).returning();
    await db.insert(templateSplits).values([{ templateId: template.id, accountId: bank.id, amountCents: -100 }, { templateId: template.id, accountId: expense.id, amountCents: 100 }]);
    await db.insert(templateTags).values({ templateId: template.id, tagId: tag.id });
    const createTx = async (lines, extra = {}) => {
      const res = await post(transactionsRoute, '/', { transactionDate: '2026-01-01', splits: lines.map(([accountId, amountCents]) => ({ accountId, amountCents })), tagIds: [tag.id], ...extra });
      assert.equal(res.status, 201);
      return (await res.json()).data;
    };
    await createTx([[bank.id, -300], [expense.id, 200], [cash.id, 100]]);
    await createTx([[bank.id, -400], [cash.id, 400]]);
    await createTx([[bank.id, -500], [settlement.id, 500]]);
    await createTx([[settlement.id, -500], [bank.id, 500]]);
    const voided = await createTx([[bank.id, -600], [expense.id, 600]], { isCleared: true });
    assert.equal((await post(transactionsRoute, `/${voided.id}/void`, { date: '2026-01-02', reason: 'Duplicate' })).status, 201);
    const configTables = [accounts, tags, budgets, transactionTemplates, templateSplits, templateTags];
    const configuration = await Promise.all(configTables.map(table => db.select().from(table)));

    await t.test('confirmation, scope and content type are validated before mutation', async () => {
      const before = await summary();
      for (const body of [null, {}, { confirmation: 'delete all transactions', revision: before.revision }, { confirmation: 'DELETE ALL TRANSACTIONS' }, { confirmation: 'DELETE ALL TRANSACTIONS', revision: before.revision, ledgerId: 'other' }]) {
        assert.equal((await post(route, '/transactions/clear', body)).status, 400);
      }
      assert.equal((await route.request('/transactions/clear', { method: 'POST', body: 'confirmation=DELETE ALL TRANSACTIONS' })).status, 415);
      assert.equal((await route.request('/transactions/clear')).status, 404);
      assert.deepEqual(await summary(), before);
    });

    await t.test('same-count edit invalidates confirmation', async () => {
      const before = await summary();
      await db.update(transactions).set({ note: 'changed' }).where(eq(transactions.id, voided.id));
      const res = await clear(before.revision);
      assert.equal(res.status, 409);
      assert.equal((await summary()).transactions, before.transactions);
    });

    await t.test('failure after dependent deletes rolls back every table', async () => {
      await queryClient.unsafe(`CREATE FUNCTION fail_reset() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected failure'; END $$`);
      await queryClient.unsafe('CREATE TRIGGER fail_reset BEFORE DELETE ON transactions FOR EACH STATEMENT EXECUTE FUNCTION fail_reset()');
      const before = await summary();
      try {
        assert.equal((await clear(before.revision)).status, 500);
        assert.deepEqual(await summary(), before);
      } finally {
        await queryClient.unsafe('DROP TRIGGER fail_reset ON transactions');
        await queryClient.unsafe('DROP FUNCTION fail_reset()');
      }
    });

    await t.test('reset waits for concurrent writer and rejects stale confirmation', async () => {
      const before = await summary();
      let release, locked;
      const ready = new Promise(resolve => { locked = resolve; });
      const gate = new Promise(resolve => { release = resolve; });
      const writing = db.transaction(async tx => {
        await lockLedgerHistory(tx);
        const [record] = await tx.insert(transactions).values({ transactionDate: '2026-02-01', note: 'Concurrent new transaction' }).returning();
        await tx.insert(splits).values([{ transactionId: record.id, accountId: bank.id, amountCents: -100 }, { transactionId: record.id, accountId: expense.id, amountCents: 100 }]);
        locked();
        await gate;
      });
      await ready;
      let finished = false;
      const resetting = clear(before.revision).then(res => { finished = true; return res; });
      try {
        await new Promise(resolve => setTimeout(resolve, 50));
        assert.equal(finished, false);
      } finally { release(); }
      await writing;
      assert.equal((await resetting).status, 409);
      assert.equal((await summary()).transactions, before.transactions + 1);
    });

    await t.test('complete history is removed, definitions and zero balances preserved', async () => {
      const before = await summary();
      assert.equal(before.transactions, 8);
      const res = await clear(before.revision);
      assert.equal(res.status, 200);
      assert.deepEqual((await res.json()).data, { transactions: before.transactions, splits: before.splits, transactionTags: before.transactionTags });
      const after = await summary();
      assert.equal(after.transactions + after.splits + after.transactionTags, 0);
      assert.deepEqual(await Promise.all(configTables.map(table => db.select().from(table))), configuration);
      for (const path of ['/summary', '/summary?asOf=2026-01-01']) {
        const report = (await (await reportsRoute.request(path)).json()).data;
        assert.ok(report.accountBalances.every(account => account.balanceCents === 0));
      }
      assert.equal((await clear(before.revision)).status, 409);
      assert.deepEqual((await (await clear(after.revision)).json()).data, { transactions: 0, splits: 0, transactionTags: 0 });
      const opening = await post(transactionsRoute, '/adjustments', { transactionDate: '2026-01-03', adjustment: { kind: 'adjustment', accountId: bank.id, method: 'amount', total: '25.00' } });
      assert.equal(opening.status, 201);
      await createTx([[bank.id, -100], [expense.id, 100]]);
      assert.equal((await summary()).transactions, 2);
    });
  } finally {
    await queryClient?.end();
    // Only this generated, verified test database can be dropped.
    if (created && /^penga_reset_test_[a-f0-9]{32}$/.test(databaseName)) await admin`DROP DATABASE ${admin(databaseName)}`;
    await admin.end();
  }
});
