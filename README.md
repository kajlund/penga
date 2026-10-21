# Penga 💰

> A custom, self-hosted personal finance manager optimized for manual transaction entry, multi-account management, deep split-cost allocation, and structured statement reconciliation.

---

## Overview & Architecture

Penga is built as a modern TypeScript monorepo using native **npm workspaces**. It relies on a simplified double-entry bookkeeping model where financial movements balance across accounts using integer-based cents to avoid floating-point rounding inaccuracies. Categories and reporting rollups exist natively in a unified **Self-Referencing Hierarchical Account Tree (`parent_id`)**.

```
penga/
├── apps/
│   ├── api/          # Node.js + Hono REST API backend with Drizzle ORM & PostgreSQL
│   └── web/          # TypeScript + Lit Single Page Application (SPA) with Vite
├── packages/
│   └── shared/       # Shared TypeScript domain models, interfaces, and enums
├── doc/
│   └── ds.md         # Design & Architecture Specification
└── package.json      # Monorepo root workspace configuration
```

---

## Workspace Packages & Apps

### 1. `apps/api` (`@penga/api`)

The backend REST API server:

- **Framework**: [Hono](https://hono.dev/) with `@hono/node-server`.
- **Database & ORM**: PostgreSQL connected via [Drizzle ORM](https://orm.drizzle.team/) and `postgres.js`.
- **Configuration**: Automatically loads `.env` from the repository root (and allows local overrides).
- **Features**:
  - `GET /health`: Health check testing server status and live PostgreSQL connectivity.
  - `GET /api/accounts`: Flat listing with filter queries (`?type=...`, `?parentId=...`).
  - `GET /api/accounts/tree`: O(N) hierarchical tree construction returning nested account hierarchies.
  - `GET /api/accounts/:id`: Single account details.
  - `POST /api/accounts`: Validated account creation (supports parent account references).
  - `PATCH /api/accounts/:id`: Account updates with cycle detection (prevents circular dependencies).
  - `DELETE /api/accounts/:id`: Account deletion.
  - `npm run db:migrate`: Programmatic migration runner.
  - `npm run db:seed`: Idempotent seed script populating default asset accounts and hierarchies.

### 2. `apps/web` (`@penga/web`)

The client frontend single-page application:

- **Framework**: [Lit 3](https://lit.dev/) reactive web components.
- **Bundler & Dev Server**: [Vite](https://vitejs.dev/) with API proxying to `http://localhost:3000`.
- **Theme Engine**:
  - **Parchment Light Mode** (`:root`): Warm parchment tones, clean cards, stone borders.
  - **Charcoal Dark Mode** (`[data-theme="dark"]`): Deep charcoal background, elevated slate cards.
  - Synchronous early bootstrap script in `index.html` preventing Flash of Unstyled Theme (FOUT).
  - Theme choice persisted to `localStorage` with cross-tab sync.
- **Components**:
  - `<penga-app>`: Core application shell with two-column responsive layout and breadcrumbs.
  - `<penga-sidebar>`: Navigation bar with view routing and PostgreSQL status indicator.
  - `<penga-accounts>`: Hierarchical account tree explorer with category filter pills, expand/collapse toggles, modal account creation with searchable line-icon picker, and deletion.
  - `<theme-toggle>`: Animated Sun/Moon theme switcher.

### 3. `packages/shared` (`@penga/shared`)

The shared TypeScript library:

- Exports domain enums: `AccountType` (`ASSET`, `LIABILITY`, `INCOME`, `EXPENSE`).
- Exports interfaces: `Account`, `AccountTreeNode`, `Transaction`, `Split`, `CreateAccountInput`, `UpdateAccountInput`.
- Consumed by both backend and frontend to guarantee end-to-end type safety.

---

## Prerequisites

- **Node.js**: Node 24 LTS is the DreamQuest target (`.nvmrc`: `24`); local compatibility verification is blocked by NVM trust enforcement.
- **npm**: Use npm and the single committed root lockfile; no specific npm version is mandated.
- **PostgreSQL**: Local or remote PostgreSQL instance accessible via `DATABASE_URL`

---

## Getting Started

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd Penga
npm ci --include=dev
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` in the repository root and replace the placeholders:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<database>
```

### 3. Initialize Database & Seed Data

```bash
# Generate SQL migrations (if schema changed)
npm run db:generate -w @penga/api

# Apply migrations to PostgreSQL
npm run db:migrate -w @penga/api

# Seed initial core asset accounts and sub-accounts
npm run db:seed -w @penga/api
```

### 4. Start Development Servers

Run both the API backend (port 3000) and Frontend SPA (port 5173) concurrently:

```bash
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) in your browser.

---

## Common Scripts Reference

| Command                             | Description                                                                     |
| :---------------------------------- | :------------------------------------------------------------------------------ |
| `npm run dev`                       | Runs API (`node/tsx watch`) and Web (`vite`) concurrently with colored logs     |
| `npm run dev:api`                   | Starts only the API backend                                                     |
| `npm run dev:web`                   | Starts only the Vite frontend                                                   |
| `npm run dev:all`                   | Runs shared library watcher alongside API and Web                               |
| `npm run build`                     | Compiles project references and builds the Vite production bundle               |
| `npm run typecheck`                 | Checks project references and emits ignored JS, declarations and build metadata |
| `npm run clean`                     | Cleans TypeScript build artifacts and `.tsbuildinfo` caches                     |
| `npm run db:generate -w @penga/api` | Generates Drizzle migration files                                               |
| `npm run db:migrate -w @penga/api`  | Applies pending migrations to PostgreSQL                                        |
| `npm run db:seed -w @penga/api`     | Runs idempotent database seeding                                                |

---

## Documentation

- [Design & Architecture Specification](doc/ds.md): Complete domain model, Drizzle schema, split-ledger rules, and entity-relationship diagrams.

## Guided transaction entry

Record Transaction defaults to Expense, with Income, Transfer, Adjustment and a secondary Advanced ledger entry option. All modes write the existing integer-cent, balanced split ledger:

- Expense credits the paying asset/liability account and debits allocations, including receivable assets.
- Income debits the receiving account and credits allocations.
- Transfer credits the source and debits the destination; both must be asset/liability accounts.
- Adjustment uses the existing Opening Balances equity account. Enter adjustment amount applies a signed change; Set account balance computes the difference from the current **direct** balance across all recorded dates, excluding child accounts. Liability balances retain the existing negative-debt convention.

`POST /api/transactions/adjustments` calculates corrections atomically and rejects a stale expected balance. Other creation/editing and template contracts are unchanged; no migration is needed. Existing transactions remain editable in Advanced mode. Representable templates open guided; equity, unusual, and zero-amount templates retain their raw ledger lines. Zero-amount templates remain reusable but cannot be recorded until valid.

The current schema has no currency field or exchange-rate model. Entry formatting uses the shared EUR application default; cross-currency conversion is outside this change.

Run `npm test` for domain, component and API contract tests. Database tests require an explicitly configured disposable database. Never enable `PENGA_DATABASE_TESTS`, `PENGA_RESET_DATABASE_TESTS` or `PENGA_SCHEMA_DATABASE_TESTS` against personal or production data, even with rollback or temporary-schema isolation. Leave all three flags unset for ordinary verification. `npm run build -w @penga/web` verifies the production frontend bundle.

- [Clear all transactions](doc/clear-transactions.md): Reset scope, confirmation, concurrency and safe verification.

- [Icons and calm theme](doc/icons-and-theme.md): Icon compatibility, semantic tokens and manual visual checks.

## Linting and formatting

Penga uses root ESLint and Prettier configuration following DreamQuest conventions. Run these commands from the repository root:

```sh
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

ESLint checks supported JavaScript and TypeScript files and treats warnings as failures. Prettier formats its supported source, configuration, and documentation files with single quotes, trailing commas, and LF line endings. Dependencies, generated builds and test output, local data, editor settings, archived artifacts, and dependency lockfiles are excluded. SQL and Nunjucks templates are outside the installed tools' supported file types.

### Statement reconciliation

Apply migration `0009_keen_the_watchers.sql` with `npm run db:migrate -w @penga/api` before starting this version. It adds reconciliation history and per-split membership; it does not reconcile existing entries automatically.

In Reconciliation, choose an Asset, Liability or Settlement account, enter the statement start, closing date and signed closing balance, then select the account entries shown on the statement. Negative liabilities use the same signed balance convention as Accounts. The first statement starts from the account's opening balance dated on or before the statement start (including that exact date), or zero. Record a genuine opening balance in the account form when needed. Later statements start from the latest completed closing balance and must begin after that statement's closing date. Older outstanding entries remain selectable regardless of the statement start.

Completion requires an exact zero difference and saves membership atomically under the existing ledger write lock. Entries after the closing date, voided entries and previously reconciled entries are ineligible. Date/search/status display filters do not change selection or calculation; the screen reports hidden selected entries. Transactions also provides inclusive calendar-date filters, loads all matching pages before display filtering and labels filtered movement separately from account balance.

History opens each active completed statement's entries. Undo latest reconciliation requires an inline confirmation, releases only that account's membership, preserves cleared status and retains an undone history record. Undo statements in reverse chronological order before changing protected transaction dates, amounts, splits, cleared status, or deleting/voiding them. Description and tag changes remain available. Clear all transactions removes reconciliation membership and history together with ledger history.

Run reconciliation database tests using `PENGA_SCHEMA_DATABASE_TESTS=1 node --test apps/api/test/reconciliation.test.mjs` after building. These tests create, verify and remove a separate temporary schema, including reset verification there; they do not reset the normal ledger.

### Monthly expense budget

The Budget page uses the same alphabetical account hierarchy as Accounts, restricted to expense accounts. Groups sum descendant targets and all expense spending, including direct parent postings. Direct parent postings are unbudgeted. Remaining and usage apply only to budgeted accounts; unbudgeted spending is shown separately. Saved parent targets are preserved and explicitly excluded from calculated totals to prevent overlap. Parent notes remain editable, and legacy targets can be removed without losing notes.

Recurring targets and notes apply to every month. Existing month-specific overrides remain supported and labelled; the page does not create new overrides. A blank target means **No budget**; zero is an explicit zero target. Removing a target keeps its note. Signed expense splits determine actual spending by transaction calendar date, so refunds reduce spending; voided transactions and opening balances are excluded. Transfers and principal repayments without an expense split are outside this budget.

The ledger has no per-account currency model. Budget uses the existing `APP_CURRENCY` EUR default and `en-IE` formatter, matching the rest of the app. It does not introduce currency conversion.

Set **Historical coverage** only when expense records are complete from that date. Averages use fully covered, completed months before the viewed month, counting confirmed zero-spending months and reporting the actual sample size. A partial first month is excluded. Until coverage is set, averages show **Not enough history**. Current-month pace uses spending through today and elapsed calendar days; it is an estimate and is unavailable for past/future months. The browser supplies its local calendar date; API requests without a date default to Europe/Helsinki.

Apply migration `0010_wild_whistler.sql` with `npm run db:migrate -w @penga/api` before running this version. It makes budget targets nullable to preserve notes on removal and adds the historical-coverage setting; existing targets and notes are unchanged. Budget database tests can run with `PENGA_SCHEMA_DATABASE_TESTS=1 node --test apps/api/test/budgets.test.mjs` after building; they use isolated temporary schemas.

## Validation and production operation

| Root command           | Behavior                                                                |
| ---------------------- | ----------------------------------------------------------------------- |
| `npm start`            | Starts compiled API; serves built web assets when present               |
| `npm test`             | Builds, then runs shared, API and web suites once; missing scripts fail |
| `npm run lint`         | ESLint validation with zero warnings                                    |
| `npm run format`       | Applies Prettier; review scope to avoid unrelated formatting            |
| `npm run format:check` | Checks formatting without rewriting                                     |
| `npm run check`        | Typecheck, lint, then tests; stops at first failure                     |

Typecheck uses `tsc -b` and emits ignored output. Check includes the existing build prerequisite through test: tests import compiled modules, and static-serving tests require the Vite bundle. Formatting remains separate. No coverage collection or threshold is configured. Historical design documents remain in `doc/`; see [standardization record](docs/dreamquest-standardization.md).

Builds need development dependencies: run `npm ci --include=dev` then `npm run build` from root. Retain shared/API/web output, workspace manifests and links, and `apps/api/drizzle` including metadata. Production starts with `npm start`; startup does not migrate. Back up the database and explicitly apply reviewed pending migrations when required. Source migration commands need development tooling; after building, the existing compiled runner is `node apps/api/dist/db/migrate.js` from root. Validate that procedure in staging before production use. Generate migrations only for intentional schema changes; seeding is optional data creation, not routine deployment.

External `../../deploy.apps.json` identifies service `penga`, directory `/srv/storage/apps/penga`, environment file `/etc/penga/penga.env`, and health URL `http://127.0.0.1:5010/health`. External `../../deploy.ps1` archives local files, installs/builds in staging, prunes devDependencies, and restarts the service with health checking and rollback. These files were inspected, not modified. Confirm the live unit, runtime, working directory, environment, backup procedure and reverse proxy. Ensure the build install includes devDependencies even under a production environment.

Default API port is 3000; production PORT must match deployment health checks. Both health routes query PostgreSQL but return HTTP 200 with status ok even on database errors. HTTP success alone does not establish readiness. Missing web output only produces a startup warning.

Root dotenv loading preserves process variables; a different cwd-local .env overrides them. npm workspace commands normally run from the workspace. The database module also loads configuration during import. Avoid unintended local environment files in production; changing precedence requires a separate decision.

Keep private financial inputs, exports, backups and reports in ignored `data/`, `exports/`, `backups/` or `reports/` directories. Arbitrarily named JSON, PDF or SQL dumps outside these locations are not universally ignored; review staging before committing. Intentional fixtures belong in test directories. Git ignore rules do not control deployment packaging: the external archive does not exclude these private directories. Review packaging before deploying a checkout containing private files.
