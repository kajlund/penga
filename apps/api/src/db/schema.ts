import {
  pgTable,
  uuid,
  text,
  pgEnum,
  timestamp,
  date,
  integer,
  boolean,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const accountTypeEnum = pgEnum('account_type', [
  'ASSET',
  'LIABILITY',
  'INCOME',
  'EXPENSE',
]);

export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  type: accountTypeEnum('type').notNull(),
  parentId: uuid('parent_id').references((): AnyPgColumn => accounts.id, {
    onDelete: 'cascade',
  }),
  icon: text('icon'),
  color: text('color'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  transactionDate: date('transaction_date', { mode: 'string' }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  payee: text('payee'),
  isCleared: boolean('is_cleared').default(false).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const splits = pgTable('splits', {
  id: uuid('id').defaultRandom().primaryKey(),
  transactionId: uuid('transaction_id')
    .references(() => transactions.id, { onDelete: 'cascade' })
    .notNull(),
  accountId: uuid('account_id')
    .references(() => accounts.id, { onDelete: 'restrict' })
    .notNull(),
  amountCents: integer('amount_cents').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const budgets = pgTable('budgets', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id')
    .references(() => accounts.id, { onDelete: 'cascade' })
    .notNull(),
  targetAmountCents: integer('target_amount_cents').notNull(),
  periodYear: integer('period_year'),
  periodMonth: integer('period_month'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Drizzle Relations
export const accountsRelations = relations(accounts, ({ one, many }) => ({
  parent: one(accounts, {
    fields: [accounts.parentId],
    references: [accounts.id],
    relationName: 'account_hierarchy',
  }),
  children: many(accounts, {
    relationName: 'account_hierarchy',
  }),
  splits: many(splits),
  budgets: many(budgets),
}));

export const transactionsRelations = relations(transactions, ({ many }) => ({
  splits: many(splits),
}));

export const splitsRelations = relations(splits, ({ one }) => ({
  transaction: one(transactions, {
    fields: [splits.transactionId],
    references: [transactions.id],
  }),
  account: one(accounts, {
    fields: [splits.accountId],
    references: [accounts.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  account: one(accounts, {
    fields: [budgets.accountId],
    references: [accounts.id],
  }),
}));

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type Split = typeof splits.$inferSelect;
export type NewSplit = typeof splits.$inferInsert;

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;

