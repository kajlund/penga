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
  - `<penga-accounts>`: Hierarchical account tree explorer with category filter pills, expand/collapse toggles, modal account creation with emoji picker, and deletion.
  - `<theme-toggle>`: Animated Sun/Moon theme switcher.

### 3. `packages/shared` (`@penga/shared`)
The shared TypeScript library:
- Exports domain enums: `AccountType` (`ASSET`, `LIABILITY`, `INCOME`, `EXPENSE`).
- Exports interfaces: `Account`, `AccountTreeNode`, `Transaction`, `Split`, `CreateAccountInput`, `UpdateAccountInput`.
- Consumed by both backend and frontend to guarantee end-to-end type safety.

---

## Prerequisites

- **Node.js**: v20+ or v24+
- **npm**: v10+
- **PostgreSQL**: Local or remote PostgreSQL instance accessible via `DATABASE_URL`

---

## Getting Started

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd Penga
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the repository root:

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

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs API (`node/tsx watch`) and Web (`vite`) concurrently with colored logs |
| `npm run dev:api` | Starts only the API backend |
| `npm run dev:web` | Starts only the Vite frontend |
| `npm run dev:all` | Runs shared library watcher alongside API and Web |
| `npm run build` | Compiles TypeScript solution project references across all workspaces |
| `npm run typecheck` | Type-checks all packages without emitting output |
| `npm run clean` | Cleans TypeScript build artifacts and `.tsbuildinfo` caches |
| `npm run db:generate -w @penga/api` | Generates Drizzle migration files |
| `npm run db:migrate -w @penga/api` | Applies pending migrations to PostgreSQL |
| `npm run db:seed -w @penga/api` | Runs idempotent database seeding |

---

## Documentation

- [Design & Architecture Specification](doc/ds.md): Complete domain model, Drizzle schema, split-ledger rules, and entity-relationship diagrams.
