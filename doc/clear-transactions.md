# Clear all transactions

Open **Settings → Data management → Clear all transactions**. The dialog loads a
server-calculated transaction count across the entire single-user ledger, with
no account/date/visibility filters. Back up the database first if you may need to
restore it. Penga currently has no export or backup/restore feature.

Type exactly `DELETE ALL TRANSACTIONS` to enable the action. Cancel or Escape
closes the dialog before submission. During submission all actions are disabled.
Errors retain the dialog. If history changed, use **Refresh summary**, review the
new count, and type the phrase again. Success displays the actual deleted count.

## Scope

The reset deletes `transaction_tags`, `splits`, then `transactions`, including
opening balances, transfers, settlement payments, cleared/reconciliation marks,
voided originals, reversals, and their links, atomically. It preserves every
account (including hierarchy/category and settlement/equity accounts), budget,
tag, transaction template, template split and template-tag association, with
their IDs and settings. Payees exist only as transaction text, so that history is
removed; there is no separate reusable payee definition to preserve.

Opening balances are ordinary transactions. All balances, dashboard totals and
historical reports are calculated from splits, so they become zero without
special display rules. Re-enter opening balances through the existing Balance
Adjustment flow. Nothing generates replacement transactions during the reset.

Reconciliation currently consists of transaction cleared flags. There are no
separate reconciliation sessions, statements, period locks, attachments, import
mappings, stored balance snapshots, external caches or scheduled loan history.
No missing features are introduced by this change.

## API and consistency

- `GET /api/data-management/transactions/summary` returns transaction, split and
  association counts and a revision; responses use `Cache-Control: no-store`.
- `POST /api/data-management/transactions/clear` requires JSON containing only
  `confirmation` and `revision`. Incorrect/missing confirmation returns 400;
  stale history returns 409; database failures return 500 after rollback. Success
  returns actual deletion counts after commit.

Penga retains its existing single-user security model without authentication.
There is no client-selectable user/ledger/account reset scope. The mutation is
JSON-only and the app does not grant cross-origin access, preventing ordinary
cross-site form submissions.

Summary, reset, and all transaction write paths (including initial balances,
adjustments, cleared status, reordering, delete/void and tag deletion that cascades
associations) acquire `SHARE ROW EXCLUSIVE` table locks on `transactions`,
`splits`, `transaction_tags`, in that order before writes. PostgreSQL also makes
direct SQL writes wait. Reads remain available. A reset waits for earlier writes,
then verifies its revision inside the locked transaction. Later writers wait
until commit and become new history afterward; they are not included in the reset.

The revision is SHA-256 over the sorted full persisted rows and PostgreSQL `xmin`
row versions from all three tables. This detects same-count edits, split/tag
changes and edits restoring previous values, rather than relying on counts or
timestamps. The summary scans the whole ledger and briefly serializes writes;
this deliberately favors correctness for this personal-finance application.

Existing single-transaction delete/void protections remain in place. Reset uses
explicit deletes, without TRUNCATE, schema changes or identity resets. There are
no server caches to invalidate. The application refreshes mounted views and
clears its selected transaction; views fetch fresh data when remounted, and the
transaction form reloads balances when reopened.

## Verification

No migration is required. Run `npm test`, `npm run typecheck`, and
`git diff --check` for normal checks. Database reset coverage is opt-in:

```powershell
$env:DATABASE_URL = 'postgres://<test-admin>:<password>@127.0.0.1:5432/postgres'
$env:PENGA_RESET_DATABASE_TESTS = '1'
node --test apps/api/test/clear-history.test.mjs
```

The test role must have permission to create databases. The test creates a
randomly named `penga_reset_test_*` database, verifies the actual connection's
database name before migrations or fixtures, applies existing migrations only
there, and drops only that generated database afterward. No reset test runs on
the configured application database. There are no cross-ledger/authorization
tests because the current app has neither multiple ledgers nor authentication.

For manual verification, use a disposable test ledger: add accounts with opening
balances, a split expense, a transfer and settlement payment, and void a cleared
transaction. Open Settings and check the count. Verify Cancel/Escape and incorrect
phrases cause no change. Edit history while the confirmation dialog is open and
check that reset requires refreshing/retyping. Clear it, then inspect Dashboard,
Transactions, Reconciliation and budget reports for empty history/zero totals.
Check that accounts, tags, budgets and templates remain, and add a fresh opening
balance through Balance Adjustment. Reopening the action should show the new
count; clearing an empty ledger shows the empty state.
