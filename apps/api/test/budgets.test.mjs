import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

// Use a separate database, or an explicitly selected temporary schema with no
// public search-path fallback. Verify storage isolation before any reset.
test(
  'hierarchical budgets in isolated PostgreSQL storage',
  {
    skip:
      process.env.PENGA_RESET_DATABASE_TESTS !== '1' &&
      process.env.PENGA_SCHEMA_DATABASE_TESTS !== '1',
  },
  async (t) => {
    dotenv.config({
      path: fileURLToPath(new URL('../../../.env', import.meta.url)),
      quiet: true,
    });
    const url = new URL(process.env.DATABASE_URL);
    const databaseName = `penga_reset_test_${randomUUID().replaceAll('-', '')}`;
    const admin = postgres(url.toString(), { max: 1 });
    const schemaMode = process.env.PENGA_SCHEMA_DATABASE_TESTS === '1';
    const schemaName = databaseName;
    let queryClient;
    let created = false;
    try {
      if (schemaMode) {
        await admin`CREATE SCHEMA ${admin(schemaName)}`;
        url.searchParams.set('options', '-c search_path=' + schemaName);
      } else {
        await admin`CREATE DATABASE ${admin(databaseName)}`;
        url.pathname = '/' + databaseName;
      }
      created = true;
      process.env.DATABASE_URL = url.toString();
      const connection = await import('../dist/db/index.js');
      queryClient = connection.queryClient;
      if (schemaMode) {
        assert.equal(
          (await queryClient`SELECT current_schema() AS name`)[0].name,
          schemaName,
        );
        const journal = JSON.parse(
          await readFile(
            new URL('../drizzle/meta/_journal.json', import.meta.url),
            'utf8',
          ),
        );
        for (const entry of journal.entries) {
          const source = await readFile(
            new URL('../drizzle/' + entry.tag + '.sql', import.meta.url),
            'utf8',
          );
          for (const statement of source
            .replaceAll('"public".', '"' + schemaName + '".')
            .split('--> statement-breakpoint')) {
            if (statement.trim()) await queryClient.unsafe(statement);
          }
        }
        const tables =
          await queryClient`SELECT n.nspname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.oid IN ('accounts'::regclass, 'transactions'::regclass, 'splits'::regclass, 'transaction_tags'::regclass, 'template_splits'::regclass)`;
        assert.equal(tables.length, 5);
        assert.ok(tables.every((table) => table.nspname === schemaName));
      } else {
        assert.equal(
          (await queryClient`SELECT current_database() AS name`)[0].name,
          databaseName,
        );
        await migrate(drizzle(queryClient), {
          migrationsFolder: fileURLToPath(
            new URL('../drizzle/', import.meta.url),
          ),
        });
      }

      const { db, accounts, budgets, transactions, splits, budgetSettings } =
        connection;
      const { eq } = await import('drizzle-orm');
      const { budgetsRoute: route } = await import('../dist/routes/budgets.js');
      const call = (path, body) =>
        route.request(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      const [group, bank] = await db
        .insert(accounts)
        .values([
          { name: 'Expense group', type: 'EXPENSE' },
          { name: 'Bank', type: 'ASSET' },
        ])
        .returning();
      const [food, travel] = await db
        .insert(accounts)
        .values([
          { name: 'Food', parentId: group.id, type: 'EXPENSE' },
          { name: 'Travel', parentId: group.id, type: 'EXPENSE' },
        ])
        .returning();
      await db.insert(budgets).values([
        {
          accountId: group.id,
          targetAmountCents: 90000,
          notes: 'Preserve group note',
        },
        {
          accountId: food.id,
          targetAmountCents: 1000,
          notes: 'Preserve leaf note',
        },
      ]);
      const record = async (date, lines, extra = {}) => {
        const [tx] = await db
          .insert(transactions)
          .values({ transactionDate: date, ...extra })
          .returning();
        await db.insert(splits).values(
          lines.map(([accountId, amountCents]) => ({
            transactionId: tx.id,
            accountId,
            amountCents,
          })),
        );
      };
      await record('2026-10-01', [
        [food.id, 1200],
        [travel.id, 300],
        [bank.id, -1500],
      ]);
      await record('2026-10-31', [
        [food.id, -100],
        [bank.id, 100],
      ]);
      await record('2026-09-30', [
        [food.id, 600],
        [bank.id, -600],
      ]);
      await record(
        '2026-10-10',
        [
          [food.id, 9000],
          [bank.id, -9000],
        ],
        { voidedAt: new Date() },
      );
      await record('2026-10-02', [
        [group.id, 200],
        [bank.id, -200],
      ]);
      const get = async (month = 10) => {
        const r = await route.request(
          '/?year=2026&month=' + month + '&today=2026-10-14',
        );
        assert.equal(r.status, 200);
        return (await r.json()).data;
      };
      await t.test(
        'database report preserves parent target and notes, sums signed expense splits once',
        async () => {
          const r = await get();
          assert.equal(r.totals.targetCents, 1000);
          assert.equal(r.totals.actualCents, 1600);
          assert.equal(r.totals.budgetedSpentCents, 1100);
          assert.equal(r.totals.unbudgetedSpentCents, 500);
          assert.equal(r.totals.remainingCents, -100);
          assert.equal(r.items[0].excludedParentTargetCents, 90000);
          assert.equal(r.items[0].savedBudget.notes, 'Preserve group note');
          assert.equal(r.items[0].rolling3MonthAvgCents, null);
        },
      );
      await t.test(
        'parent edits rejected, notes preserved, explicit removal keeps group and leaf notes',
        async () => {
          assert.equal(
            (await call('/', { accountId: group.id, targetAmountCents: 100 }))
              .status,
            409,
          );
          assert.equal(
            (
              await call('/', {
                accountId: group.id,
                notes: 'Edited group note',
              })
            ).status,
            200,
          );
          let [g] = await db
            .select()
            .from(budgets)
            .where(eq(budgets.accountId, group.id));
          assert.equal(g.targetAmountCents, 90000);
          assert.equal(
            (await call('/', { accountId: group.id, targetAmountCents: null }))
              .status,
            200,
          );
          [g] = await db
            .select()
            .from(budgets)
            .where(eq(budgets.accountId, group.id));
          assert.equal(g.notes, 'Edited group note');
          assert.equal(g.targetAmountCents, null);
          assert.equal(
            (await call('/', { accountId: food.id, targetAmountCents: null }))
              .status,
            200,
          );
          const [f] = await db
            .select()
            .from(budgets)
            .where(eq(budgets.accountId, food.id));
          assert.equal(f.notes, 'Preserve leaf note');
          assert.equal(f.targetAmountCents, null);
          assert.equal((await get()).totals.remainingCents, null);
        },
      );
      await t.test(
        'zero target budgeted, recurring edits and existing monthly overrides retained',
        async () => {
          assert.equal(
            (await call('/', { accountId: food.id, targetAmountCents: 0 }))
              .status,
            200,
          );
          assert.equal((await get()).items[0].children[0].budgetedCount, 1);
          assert.equal((await get(9)).items[0].children[0].budgetedCount, 1);
          assert.equal(
            (
              await call('/', {
                accountId: food.id,
                targetAmountCents: 500,
                periodYear: 2026,
                periodMonth: 10,
              })
            ).status,
            200,
          );
          assert.equal((await get()).totals.targetCents, 500);
          assert.equal((await get(9)).totals.targetCents, 0);
        },
      );
      await t.test(
        'coverage includes completed zero months and clears explicitly',
        async () => {
          assert.equal(
            (await call('/coverage', { trackingStartDate: '2026-08-01' }))
              .status,
            200,
          );
          let n = (await get()).items[0].children[0];
          assert.equal(n.sample3, 2);
          assert.equal(n.rolling3MonthAvgCents, 300);
          assert.equal(
            (await call('/coverage', { trackingStartDate: null })).status,
            200,
          );
          assert.equal((await get()).items[0].sample3, 0);
          assert.equal((await db.select().from(budgetSettings)).length, 1);
        },
      );
      await t.test(
        'invalid date, target, account type and month are rejected',
        async () => {
          assert.equal(
            (await call('/', { accountId: food.id, targetAmountCents: -1 }))
              .status,
            400,
          );
          assert.equal(
            (await call('/', { accountId: food.id, targetAmountCents: 1.5 }))
              .status,
            400,
          );
          assert.equal(
            (await call('/', { accountId: bank.id, targetAmountCents: 100 }))
              .status,
            400,
          );
          assert.equal(
            (
              await call('/', {
                accountId: food.id,
                targetAmountCents: 100,
                periodMonth: 10,
              })
            ).status,
            400,
          );
          assert.equal(
            (await call('/coverage', { trackingStartDate: '2026-02-30' }))
              .status,
            400,
          );
          assert.equal(
            (await route.request('/?year=2026&month=1.5')).status,
            400,
          );
          assert.equal(
            (await route.request('/?year=2026&month=0')).status,
            400,
          );
          assert.equal(
            (await route.request('/?year=2026&month=10&today=2026-02-30'))
              .status,
            400,
          );
        },
      );
    } finally {
      await queryClient?.end();
      // Only this generated, verified test database can be dropped.
      if (created && /^penga_reset_test_[a-f0-9]{32}$/.test(databaseName)) {
        if (schemaMode) await admin`DROP SCHEMA ${admin(schemaName)} CASCADE`;
        else await admin`DROP DATABASE ${admin(databaseName)}`;
      }
      await admin.end();
    }
  },
);
