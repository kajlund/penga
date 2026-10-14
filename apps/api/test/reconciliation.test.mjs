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
  'statement reconciliation in isolated PostgreSQL storage',
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

      const {
        db,
        accounts,
        transactions,
        splits,
        reconciliationEntries,
        reconciliations,
      } = connection;
      const { eq } = await import('drizzle-orm');
      const { reconciliationsRoute: route } =
        await import('../dist/routes/reconciliations.js');
      const { transactionsRoute: ledger } =
        await import('../dist/routes/transactions.js');
      const { createOpeningBalance } =
        await import('../dist/domain/opening-balances.js');
      const { lockLedgerHistory, ledgerHistorySummary, clearLedgerHistory } =
        await import('../dist/domain/ledger-history.js');
      const call = (r, path, body, method = 'POST') =>
        r.request(path, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      const [bank, liability, expense] = await db
        .insert(accounts)
        .values([
          { name: 'Bank', type: 'ASSET' },
          { name: 'Card', type: 'LIABILITY' },
          { name: 'Expense', type: 'EXPENSE' },
        ])
        .returning();
      await db.transaction(async (tx) => {
        await lockLedgerHistory(tx);
        await createOpeningBalance(tx, bank, 10000, '2026-01-01');
      });
      const entry = async (date, lines) => {
        const [record] = await db
          .insert(transactions)
          .values({ transactionDate: date, payee: 'Test' })
          .returning();
        return db
          .insert(splits)
          .values(
            lines.map(([accountId, amountCents]) => ({
              transactionId: record.id,
              accountId,
              amountCents,
            })),
          )
          .returning();
      };
      const transfer = await entry('2026-01-02', [
        [bank.id, -1000],
        [liability.id, 1000],
      ]);
      const older = await entry('2025-12-30', [
        [bank.id, -200],
        [expense.id, 200],
      ]);
      const split = await entry('2026-02-01', [
        [bank.id, -300],
        [liability.id, -400],
        [expense.id, 700],
      ]);
      const statement = (
        startDate,
        closingDate,
        closingBalanceCents,
        entryIds,
      ) => ({ startDate, closingDate, closingBalanceCents, entryIds });
      const first = statement('2026-01-01', '2026-01-31', 9000, [
        transfer[0].id,
      ]);
      await t.test('nonzero difference leaves no records', async () => {
        const r = await call(route, '/' + bank.id, {
          ...first,
          closingBalanceCents: 9001,
        });
        assert.equal(r.status, 409);
        assert.equal((await db.select().from(reconciliations)).length, 0);
      });

      await t.test(
        'membership failure rolls back reconciliation and cleared status',
        async () => {
          await queryClient.unsafe(
            "CREATE FUNCTION fail_membership() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected membership failure'; END $$",
          );
          await queryClient.unsafe(
            'CREATE TRIGGER fail_membership BEFORE INSERT ON reconciliation_entries FOR EACH ROW EXECUTE FUNCTION fail_membership()',
          );
          try {
            assert.equal((await call(route, '/' + bank.id, first)).status, 409);
            assert.equal((await db.select().from(reconciliations)).length, 0);
            assert.equal(
              (await db.select().from(reconciliationEntries)).length,
              0,
            );
            const [record] = await db
              .select()
              .from(transactions)
              .where(eq(transactions.id, transfer[0].transactionId));
            assert.equal(record.isCleared, false);
          } finally {
            await queryClient.unsafe(
              'DROP TRIGGER fail_membership ON reconciliation_entries',
            );
            await queryClient.unsafe('DROP FUNCTION fail_membership()');
          }
        },
      );
      await t.test(
        'future entries, duplicate IDs and invalid chronology cannot complete',
        async () => {
          assert.equal(
            (
              await call(route, '/' + bank.id, {
                ...first,
                entryIds: [transfer[0].id, transfer[0].id],
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await call(route, '/' + bank.id, {
                ...first,
                entryIds: [split[0].id],
                closingBalanceCents: 9700,
              })
            ).status,
            409,
          );
          assert.equal(
            (
              await call(route, '/' + bank.id, {
                ...first,
                startDate: '2026-02-01',
              })
            ).status,
            400,
          );
        },
      );
      let firstId;
      await t.test(
        'opening at period start counted once; concurrent duplicate prevented',
        async () => {
          const responses = await Promise.all([
            call(route, '/' + bank.id, first),
            call(route, '/' + bank.id, first),
          ]);
          assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
          const state = (await (await route.request('/' + bank.id)).json())
            .data;
          firstId = state.latest.id;
          assert.equal(state.latest.startingBalanceCents, 10000);
          assert.equal(
            state.entries.filter((e) => e.reconciliationId).length,
            2,
          );
        },
      );
      await t.test(
        'transfer counterpart reconciles independently with signed liability movement',
        async () => {
          assert.equal(
            (
              await call(
                route,
                '/' + liability.id,
                statement('2026-01-01', '2026-01-31', 1000, [transfer[1].id]),
              )
            ).status,
            201,
          );
        },
      );
      await t.test(
        'older outstanding and split movement carried into later statement',
        async () => {
          const r = await call(
            route,
            '/' + bank.id,
            statement('2026-02-01', '2026-02-28', 8500, [
              older[0].id,
              split[0].id,
            ]),
          );
          assert.equal(r.status, 201);
        },
      );
      await t.test(
        'protected date, splits, delete and void; harmless note allowed',
        async () => {
          const id = transfer[0].transactionId;
          assert.equal(
            (
              await call(
                ledger,
                '/' + id,
                { transactionDate: '2026-03-01' },
                'PATCH',
              )
            ).status,
            409,
          );
          assert.equal(
            (
              await call(
                ledger,
                '/' + id,
                {
                  splits: [
                    { accountId: bank.id, amountCents: -5 },
                    { accountId: expense.id, amountCents: 5 },
                  ],
                },
                'PATCH',
              )
            ).status,
            409,
          );
          assert.equal(
            (await ledger.request('/' + id, { method: 'DELETE' })).status,
            409,
          );
          assert.equal(
            (await call(ledger, '/' + id + '/void', {})).status,
            409,
          );
          assert.equal(
            (await call(ledger, '/' + id, { note: 'Checked' }, 'PATCH')).status,
            200,
          );
        },
      );
      await t.test(
        'inclusive date filtering happens before pagination',
        async () => {
          const r = await ledger.request(
            '/?accountId=' +
              bank.id +
              '&from=2026-01-02&to=2026-02-01&limit=1&offset=1',
          );
          const j = await r.json();
          assert.equal(j.data.length, 1);
          assert.equal(j.data[0].transactionDate, '2026-01-02');
          assert.equal((await ledger.request('/?from=2026-02-30')).status, 400);
        },
      );
      await t.test(
        'only latest undo, cleared retained and other account unaffected',
        async () => {
          assert.equal(
            (
              await call(route, '/' + bank.id + '/' + firstId + '/undo', {
                confirmation: 'UNDO',
              })
            ).status,
            409,
          );
          let state = (await (await route.request('/' + bank.id)).json()).data;
          assert.equal(
            (
              await call(
                route,
                '/' + bank.id + '/' + state.latest.id + '/undo',
                { confirmation: 'UNDO' },
              )
            ).status,
            200,
          );
          state = (await (await route.request('/' + bank.id)).json()).data;
          assert.equal(state.latest.id, firstId);
          assert.equal(
            (
              await call(route, '/' + bank.id + '/' + firstId + '/undo', {
                confirmation: 'UNDO',
              })
            ).status,
            200,
          );
          const rows = await db.select().from(reconciliationEntries);
          assert.equal(rows.length, 1);
          const [record] = await db
            .select()
            .from(transactions)
            .where(eq(transactions.id, transfer[0].transactionId));
          assert.equal(record.isCleared, true);
        },
      );
      await t.test(
        'reset removes membership and all history in isolated test storage',
        async () => {
          const summary = await ledgerHistorySummary();
          await clearLedgerHistory('DELETE ALL TRANSACTIONS', summary.revision);
          assert.equal((await db.select().from(reconciliations)).length, 0);
          assert.equal(
            (await db.select().from(reconciliationEntries)).length,
            0,
          );
          assert.ok((await db.select().from(accounts)).length >= 3);
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
