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
  'clear history and opening balances in isolated PostgreSQL storage',
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
        tags,
        budgets,
        transactionTemplates,
        templateSplits,
        templateTags,
      } = connection;
      const { eq } = await import('drizzle-orm');
      const { accountsRoute } = await import('../dist/routes/accounts.js');
      const { transactionsRoute } =
        await import('../dist/routes/transactions.js');
      const { reportsRoute } = await import('../dist/routes/reports.js');
      const { dataManagementRoute: route } =
        await import('../dist/routes/data-management.js');
      const { lockLedgerHistory } =
        await import('../dist/domain/ledger-history.js');
      const post = (route, path, body) =>
        route.request(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      const summary = async () => {
        const res = await route.request('/transactions/summary');
        assert.equal(res.status, 200);
        assert.equal(res.headers.get('cache-control'), 'no-store');
        return (await res.json()).data;
      };
      const clear = (revision) =>
        post(route, '/transactions/clear', {
          confirmation: 'DELETE ALL TRANSACTIONS',
          revision,
        });
      const createAccount = async (name, type, initialBalanceCents = 0) => {
        const res = await post(accountsRoute, '/', {
          name,
          type,
          initialBalanceCents,
        });
        assert.equal(res.status, 201);
        return (await res.json()).data;
      };
      const bank = await createAccount('Bank', 'ASSET', 10000);
      const cash = await createAccount('Cash', 'ASSET');
      const expense = await createAccount('Food', 'EXPENSE');
      const settlement = await createAccount('Shared expenses', 'SETTLEMENT');
      const [tag] = await db
        .insert(tags)
        .values({ name: 'keep', color: '#123456' })
        .returning();
      await db.insert(budgets).values({
        accountId: expense.id,
        targetAmountCents: 5000,
        periodYear: 2026,
      });
      const [template] = await db
        .insert(transactionTemplates)
        .values({ name: 'Keep template' })
        .returning();
      await db.insert(templateSplits).values([
        { templateId: template.id, accountId: bank.id, amountCents: -100 },
        { templateId: template.id, accountId: expense.id, amountCents: 100 },
      ]);
      await db
        .insert(templateTags)
        .values({ templateId: template.id, tagId: tag.id });
      const createTx = async (lines, extra = {}) => {
        const res = await post(transactionsRoute, '/', {
          transactionDate: '2026-01-01',
          splits: lines.map(([accountId, amountCents]) => ({
            accountId,
            amountCents,
          })),
          tagIds: [tag.id],
          ...extra,
        });
        assert.equal(res.status, 201);
        return (await res.json()).data;
      };
      await createTx([
        [bank.id, -300],
        [expense.id, 200],
        [cash.id, 100],
      ]);
      await createTx([
        [bank.id, -400],
        [cash.id, 400],
      ]);
      await createTx([
        [bank.id, -500],
        [settlement.id, 500],
      ]);
      await createTx([
        [settlement.id, -500],
        [bank.id, 500],
      ]);
      const voided = await createTx(
        [
          [bank.id, -600],
          [expense.id, 600],
        ],
        { isCleared: true },
      );
      assert.equal(
        (
          await post(transactionsRoute, `/${voided.id}/void`, {
            date: '2026-01-02',
            reason: 'Duplicate',
          })
        ).status,
        201,
      );
      const configTables = [
        accounts,
        tags,
        budgets,
        transactionTemplates,
        templateSplits,
        templateTags,
      ];
      const configuration = await Promise.all(
        configTables.map((table) => db.select().from(table)),
      );

      await t.test(
        'confirmation, scope and content type are validated before mutation',
        async () => {
          const before = await summary();
          for (const body of [
            null,
            {},
            {
              confirmation: 'delete all transactions',
              revision: before.revision,
            },
            { confirmation: 'DELETE ALL TRANSACTIONS' },
            {
              confirmation: 'DELETE ALL TRANSACTIONS',
              revision: before.revision,
              ledgerId: 'other',
            },
          ]) {
            assert.equal(
              (await post(route, '/transactions/clear', body)).status,
              400,
            );
          }
          assert.equal(
            (
              await route.request('/transactions/clear', {
                method: 'POST',
                body: 'confirmation=DELETE ALL TRANSACTIONS',
              })
            ).status,
            415,
          );
          assert.equal(
            (await route.request('/transactions/clear')).status,
            404,
          );
          assert.deepEqual(await summary(), before);
        },
      );

      await t.test('same-count edit invalidates confirmation', async () => {
        const before = await summary();
        await db
          .update(transactions)
          .set({ note: 'changed' })
          .where(eq(transactions.id, voided.id));
        const res = await clear(before.revision);
        assert.equal(res.status, 409);
        assert.equal((await summary()).transactions, before.transactions);
      });

      await t.test(
        'failure after dependent deletes rolls back every table',
        async () => {
          await queryClient.unsafe(
            `CREATE FUNCTION fail_reset() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected failure'; END $$`,
          );
          await queryClient.unsafe(
            'CREATE TRIGGER fail_reset BEFORE DELETE ON transactions FOR EACH STATEMENT EXECUTE FUNCTION fail_reset()',
          );
          const before = await summary();
          try {
            assert.equal((await clear(before.revision)).status, 500);
            assert.deepEqual(await summary(), before);
          } finally {
            await queryClient.unsafe('DROP TRIGGER fail_reset ON transactions');
            await queryClient.unsafe('DROP FUNCTION fail_reset()');
          }
        },
      );

      await t.test(
        'reset waits for concurrent writer and rejects stale confirmation',
        async () => {
          const before = await summary();
          let release, locked;
          const ready = new Promise((resolve) => {
            locked = resolve;
          });
          const gate = new Promise((resolve) => {
            release = resolve;
          });
          const writing = db.transaction(async (tx) => {
            await lockLedgerHistory(tx);
            const [record] = await tx
              .insert(transactions)
              .values({
                transactionDate: '2026-02-01',
                note: 'Concurrent new transaction',
              })
              .returning();
            await tx.insert(splits).values([
              {
                transactionId: record.id,
                accountId: bank.id,
                amountCents: -100,
              },
              {
                transactionId: record.id,
                accountId: expense.id,
                amountCents: 100,
              },
            ]);
            locked();
            await gate;
          });
          await ready;
          let finished = false;
          const resetting = clear(before.revision).then((res) => {
            finished = true;
            return res;
          });
          try {
            await new Promise((resolve) => setTimeout(resolve, 50));
            assert.equal(finished, false);
          } finally {
            release();
          }
          await writing;
          assert.equal((await resetting).status, 409);
          assert.equal((await summary()).transactions, before.transactions + 1);
        },
      );

      await t.test(
        'complete history is removed, definitions and zero balances preserved',
        async () => {
          const before = await summary();
          assert.equal(before.transactions, 8);
          const res = await clear(before.revision);
          assert.equal(res.status, 200);
          assert.deepEqual((await res.json()).data, {
            transactions: before.transactions,
            splits: before.splits,
            transactionTags: before.transactionTags,
          });
          const after = await summary();
          assert.equal(
            after.transactions + after.splits + after.transactionTags,
            0,
          );
          assert.deepEqual(
            await Promise.all(
              configTables.map((table) => db.select().from(table)),
            ),
            configuration,
          );
          for (const path of ['/summary', '/summary?asOf=2026-01-01']) {
            const report = (await (await reportsRoute.request(path)).json())
              .data;
            assert.ok(
              report.accountBalances.every(
                (account) => account.balanceCents === 0,
              ),
            );
          }
          assert.equal((await clear(before.revision)).status, 409);
          assert.deepEqual((await (await clear(after.revision)).json()).data, {
            transactions: 0,
            splits: 0,
            transactionTags: 0,
          });
          const opening = await post(transactionsRoute, '/adjustments', {
            transactionDate: '2026-01-03',
            adjustment: {
              kind: 'adjustment',
              accountId: bank.id,
              method: 'amount',
              total: '25.00',
            },
          });
          assert.equal(opening.status, 201);
          await createTx([
            [bank.id, -100],
            [expense.id, 100],
          ]);
          assert.equal((await summary()).transactions, 2);
        },
      );

      await t.test(
        'opening balance lifecycle, duplicate prevention, reports and account dependencies',
        async () => {
          const patch = (route, path, body) =>
            route.request(path, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
          const del = (route, path) =>
            route.request(path, { method: 'DELETE' });
          const res = await post(accountsRoute, '/', {
            name: 'Dated opening',
            type: 'LIABILITY',
            initialBalanceCents: -10000,
            initialBalanceDate: '2026-10-01',
          });
          assert.equal(res.status, 201);
          const account = (await res.json()).data;
          assert.ok(account.createdAt); // Creation timestamp is independent of the supplied calendar date.
          const other = await createAccount('Other opening', 'ASSET', 1234);
          const openingFor = async (id) =>
            (
              await db
                .select()
                .from(transactions)
                .innerJoin(splits, eq(splits.transactionId, transactions.id))
                .where(eq(splits.accountId, id))
            )[0];
          const original = await openingFor(account.id);
          const otherBefore = await openingFor(other.id);
          assert.equal(original.transactions.transactionDate, '2026-10-01');
          const lines = await db
            .select()
            .from(splits)
            .where(eq(splits.transactionId, original.transactions.id));
          assert.equal(
            lines.reduce((sum, s) => sum + s.amountCents, 0),
            0,
          );
          const equityId = lines.find(
            (s) => s.accountId !== account.id,
          ).accountId;
          assert.equal(
            (
              await patch(accountsRoute, '/' + equityId, {
                type: 'EQUITY',
                color: '#8b5cf6',
              })
            ).status,
            200,
          );
          assert.equal(
            (await patch(accountsRoute, '/' + equityId, { type: 'ASSET' }))
              .status,
            409,
          );
          const edited = await patch(
            transactionsRoute,
            '/' + original.transactions.id,
            {
              transactionDate: '2026-09-30',
              note: 'Statement balance before October',
              splits: lines.map((s) => ({
                accountId: s.accountId,
                amountCents: s.accountId === account.id ? -20000 : 20000,
              })),
            },
          );
          assert.equal(edited.status, 200);
          const editedRecord = (await edited.json()).data;
          assert.equal(editedRecord.note, 'Statement balance before October');
          assert.equal(editedRecord.payee, 'Opening Balance');
          assert.ok(
            editedRecord.splits.every(
              (s) => !['INCOME', 'EXPENSE'].includes(s.accountType),
            ),
          );
          assert.equal(
            editedRecord.splits.reduce((sum, s) => sum + s.amountCents, 0),
            0,
          );
          assert.equal(
            editedRecord.splits.find((s) => s.accountType === 'EQUITY')
              .amountCents,
            20000,
          );
          for (const [date, expected] of [
            ['2026-09-29', 0],
            ['2026-09-30', -20000],
          ]) {
            const report = (
              await (await reportsRoute.request('/summary?asOf=' + date)).json()
            ).data;
            assert.equal(
              report.accountBalances.find((a) => a.id === account.id)
                .balanceCents,
              expected,
            );
          }
          assert.equal(
            (
              await patch(transactionsRoute, '/' + original.transactions.id, {
                transactionDate: '2026-02-30',
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await patch(transactionsRoute, '/' + original.transactions.id, {
                payee: 'Salary',
              })
            ).status,
            409,
          );
          assert.equal(
            (await patch(accountsRoute, '/' + account.id, { type: 'INCOME' }))
              .status,
            409,
          );
          assert.equal(
            (
              await patch(transactionsRoute, '/' + original.transactions.id, {
                splits: [
                  { accountId: account.id, amountCents: -100 },
                  { accountId: expense.id, amountCents: 100 },
                ],
              })
            ).status,
            409,
          );
          assert.equal(
            (
              await patch(transactionsRoute, '/' + original.transactions.id, {
                note: null,
              })
            ).status,
            200,
          );
          const beforeFailure = await openingFor(account.id);
          const failedEdit = await patch(
            transactionsRoute,
            '/' + original.transactions.id,
            { transactionDate: '2026-09-28', tagIds: [randomUUID()] },
          );
          assert.equal(failedEdit.status, 500);
          assert.equal(
            (await failedEdit.json()).error,
            'Unable to save the transaction. Please try again.',
          );
          assert.deepEqual(await openingFor(account.id), beforeFailure);
          const pending = await createTx([
            [cash.id, -50],
            [expense.id, 50],
          ]);
          assert.equal(
            (
              await patch(transactionsRoute, '/' + pending.id, {
                payee: 'Opening Balance',
              })
            ).status,
            409,
          );
          const cleared = await createTx(
            [
              [cash.id, -50],
              [expense.id, 50],
            ],
            { isCleared: true },
          );
          assert.equal(
            (await del(transactionsRoute, '/' + cleared.id)).status,
            409,
          );
          assert.equal(
            (
              await patch(accountsRoute, '/' + account.id, {
                initialBalanceCents: -5000,
                initialBalanceDate: '2026-10-01',
              })
            ).status,
            409,
          );
          const denied = await del(accountsRoute, '/' + account.id);
          assert.equal(denied.status, 409);
          assert.match((await denied.json()).error, /transactions/);
          await queryClient.unsafe(
            `CREATE FUNCTION fail_opening_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected opening deletion failure'; END $$`,
          );
          await queryClient.unsafe(
            'CREATE TRIGGER fail_opening_delete BEFORE DELETE ON splits FOR EACH STATEMENT EXECUTE FUNCTION fail_opening_delete()',
          );
          try {
            const failedDelete = await del(
              transactionsRoute,
              '/' + original.transactions.id,
            );
            assert.equal(failedDelete.status, 500);
            assert.equal(
              (await failedDelete.json()).error,
              'Unable to delete the transaction. Please try again.',
            );
            assert.deepEqual(await openingFor(account.id), beforeFailure);
          } finally {
            await queryClient.unsafe(
              'DROP TRIGGER fail_opening_delete ON splits',
            );
            await queryClient.unsafe('DROP FUNCTION fail_opening_delete()');
          }
          assert.equal(
            (await del(transactionsRoute, '/' + original.transactions.id))
              .status,
            200,
          );
          assert.equal(
            (
              await db
                .select()
                .from(splits)
                .where(eq(splits.transactionId, original.transactions.id))
            ).length,
            0,
          );
          assert.equal(
            (
              await patch(accountsRoute, '/' + account.id, {
                initialBalanceCents: -30000,
                initialBalanceDate: '2026-10-01',
              })
            ).status,
            200,
          );
          assert.deepEqual(await openingFor(other.id), otherBefore);
          const duplicateResponses = await Promise.all(
            [1, 2].map(() =>
              patch(accountsRoute, '/' + account.id, {
                initialBalanceCents: 100,
                initialBalanceDate: '2026-10-01',
              }),
            ),
          );
          assert.ok(duplicateResponses.every((r) => r.status === 409));
          assert.equal((await clear((await summary()).revision)).status, 200);
          assert.equal(
            (
              await patch(accountsRoute, '/' + other.id, {
                initialBalanceCents: 2500,
                initialBalanceDate: '2026-10-01',
              })
            ).status,
            200,
          );
          assert.equal(
            (await del(accountsRoute, '/' + account.id)).status,
            200,
          );
          const retained = await del(accountsRoute, '/' + bank.id);
          assert.equal(retained.status, 409);
          const retainedMessage = (await retained.json()).error;
          assert.match(retainedMessage, /Keep template/);
          assert.match(retainedMessage, /Open Templates/);
          assert.match(
            retainedMessage,
            /Clearing transactions keeps saved templates/,
          );
          assert.equal(
            (await del(accountsRoute, '/' + expense.id)).status,
            409,
          );
          const budgetAccount = await createAccount(
            'Budget dependency',
            'EXPENSE',
          );
          await db
            .insert(budgets)
            .values({ accountId: budgetAccount.id, targetAmountCents: 100 });
          const budgetDelete = await del(accountsRoute, '/' + budgetAccount.id);
          assert.equal(budgetDelete.status, 409);
          assert.match((await budgetDelete.json()).error, /budgets/);
          const parent = await createAccount('Parent', 'ASSET');
          const child = await post(accountsRoute, '/', {
            name: 'Child',
            type: 'ASSET',
            parentId: parent.id,
          });
          assert.equal(child.status, 201);
          const parentDelete = await del(accountsRoute, '/' + parent.id);
          assert.equal(parentDelete.status, 409);
          assert.match((await parentDelete.json()).error, /sub-accounts/);
          const concurrent = await createAccount('Concurrent opening', 'ASSET');
          const responses = await Promise.all(
            [1, 2].map(() =>
              patch(accountsRoute, '/' + concurrent.id, {
                initialBalanceCents: 100,
                initialBalanceDate: '2026-10-01',
              }),
            ),
          );
          assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
          assert.equal(
            (
              await post(accountsRoute, '/', {
                name: 'Invalid date',
                type: 'ASSET',
                initialBalanceCents: 100,
                initialBalanceDate: '2026-02-30',
              })
            ).status,
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
