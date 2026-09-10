# Penga - Personal Finance Manager: Design & Architecture Specification

## 1. Project Overview & Scope
* **Name:** Penga (derived from a local slang word for money)
* **Goal:** A custom, self-hosted personal finance manager optimized for manual transaction entry, multi-account management, deep split-cost allocation, and structured statement reconciliation.
* **Architecture:** Monorepo containing a Node.js / Hono REST API backend using Drizzle ORM against PostgreSQL, paired with a TypeScript/Lit Single Page Application (SPA) frontend.
* **Constraints:** Single currency only. No automated bank scraping or direct open-banking API hookups.

---

## 2. Domain Model & Database Schema (Drizzle ORM)

The core engine relies on a simplified double-entry bookkeeping model. Every financial movement is balanced across accounts using integer-based cents to avoid floating-point inaccuracies. 

To eliminate separate reporting abstractions, **categories and rollups are handled via a Self-Referencing Hierarchical Account Tree (`parent_id`)**. This allows accounts and expense groups to exist natively in the same structure.

### Entities & Relationships
1. **`accounts`**: Tracks all liquidity, liabilities, income, and expense categories in a unified tree. Includes optional `icon` (string/emoji) and `color` metadata for UI rendering.
   - `id` (UUID, PK)
   - `name` (String)
   - `type` (Enum: `ASSET`, `LIABILITY`, `INCOME`, `EXPENSE`)
   - `parent_id` (UUID, FK to `accounts`, nullable) — Enables nested sub-accounts and rollup reporting groups (e.g., Vehicle > Fuel).
   - `icon` (String, nullable)
   - `color` (String, nullable)
2. **`transactions`**: The parent container for any financial event.
   - `id` (UUID, PK)
   - `transaction_date` (Date)
   - `sort_order` (Integer) — Used for custom intraday sorting to match physical bank statements line-by-line.
   - `payee` (String, nullable)
   - `is_cleared` (Boolean, default `false`) — Used for periodic bank statement reconciliation.
   - `note` (String, nullable)
3. **`splits`**: The individual ledger lines belonging to a transaction. The sum of all splits for a single transaction must equal zero.
   - `id` (UUID, PK)
   - `transaction_id` (UUID, FK to `transactions`)
   - `account_id` (UUID, FK to `accounts`)
   - `amount_cents` (Integer)
4. **`transaction_templates` & `template_lines`**: Reusable blueprints for quick entry of frequent multi-split transactions, recurring rules, or transfers.
5. **`tags` & `transaction_tags`**: Cross-cutting labels (e.g., `#TaxDeductible`, `#Unnecessary`) for orthogonal filtering.
6. **`budgets`**: Monthly soft targets mapped to accounts to track spending progress via UI status bars.

### Mermaid Entity-Relationship Diagram
```mermaid
erDiagram
    ACCOUNTS ||--o{ ACCOUNTS : "parent-child hierarchy"
    ACCOUNTS ||--o{ SPLITS : "records"
    
    ACCOUNTS {
        uuid id PK
        string name
        enum type "ASSET, LIABILITY, INCOME, EXPENSE"
        uuid parent_id FK
        string icon
        string color
    }

    TRANSACTIONS ||--|{ SPLITS : "composed of"
    TRANSACTIONS {
        uuid id PK
        date transaction_date
        integer sort_order
        string payee
        boolean is_cleared
        string note
    }

    SPLITS {
        uuid id PK
        uuid transaction_id FK
        uuid account_id FK
        integer amount_cents
    }

    TRANSACTION_TEMPLATES ||--|{ TEMPLATE_LINES : "defines"
    TRANSACTION_TEMPLATES {
        uuid id PK
        string name
    }

    TEMPLATE_LINES {
        uuid id PK
        uuid template_id FK
        uuid target_account_id FK
        integer default_ratio_percent
    }