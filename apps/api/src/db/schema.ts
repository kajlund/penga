import {
  pgTable,
  uuid,
  text,
  pgEnum,
  timestamp,
  date,
  integer,
  boolean,
  primaryKey,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const accountTypeEnum = pgEnum('account_type', [
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'SETTLEMENT',
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

export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const transactionTags = pgTable(
  'transaction_tags',
  {
    transactionId: uuid('transaction_id')
      .references(() => transactions.id, { onDelete: 'cascade' })
      .notNull(),
    tagId: uuid('tag_id')
      .references(() => tags.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.transactionId, t.tagId] })]
);

export const transactionTemplates = pgTable('transaction_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  payee: text('payee'),
  note: text('note'),
  icon: text('icon'),
  color: text('color'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const templateSplits = pgTable('template_splits', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id')
    .references(() => transactionTemplates.id, { onDelete: 'cascade' })
    .notNull(),
  accountId: uuid('account_id')
    .references(() => accounts.id, { onDelete: 'restrict' })
    .notNull(),
  amountCents: integer('amount_cents').default(0).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const templateTags = pgTable(
  'template_tags',
  {
    templateId: uuid('template_id')
      .references(() => transactionTemplates.id, { onDelete: 'cascade' })
      .notNull(),
    tagId: uuid('tag_id')
      .references(() => tags.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.templateId, t.tagId] })]
);

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
  templateSplits: many(templateSplits),
}));

export const transactionsRelations = relations(transactions, ({ many }) => ({
  splits: many(splits),
  transactionTags: many(transactionTags),
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

export const tagsRelations = relations(tags, ({ many }) => ({
  transactionTags: many(transactionTags),
  templateTags: many(templateTags),
}));

export const transactionTagsRelations = relations(transactionTags, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionTags.transactionId],
    references: [transactions.id],
  }),
  tag: one(tags, {
    fields: [transactionTags.tagId],
    references: [tags.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  account: one(accounts, {
    fields: [budgets.accountId],
    references: [accounts.id],
  }),
}));

export const transactionTemplatesRelations = relations(transactionTemplates, ({ many }) => ({
  splits: many(templateSplits),
  templateTags: many(templateTags),
}));

export const templateSplitsRelations = relations(templateSplits, ({ one }) => ({
  template: one(transactionTemplates, {
    fields: [templateSplits.templateId],
    references: [transactionTemplates.id],
  }),
  account: one(accounts, {
    fields: [templateSplits.accountId],
    references: [accounts.id],
  }),
}));

export const templateTagsRelations = relations(templateTags, ({ one }) => ({
  template: one(transactionTemplates, {
    fields: [templateTags.templateId],
    references: [transactionTemplates.id],
  }),
  tag: one(tags, {
    fields: [templateTags.tagId],
    references: [tags.id],
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

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type TransactionTag = typeof transactionTags.$inferSelect;
export type NewTransactionTag = typeof transactionTags.$inferInsert;

export type TransactionTemplate = typeof transactionTemplates.$inferSelect;
export type NewTransactionTemplate = typeof transactionTemplates.$inferInsert;

export type TemplateSplit = typeof templateSplits.$inferSelect;
export type NewTemplateSplit = typeof templateSplits.$inferInsert;

export type TemplateTag = typeof templateTags.$inferSelect;
export type NewTemplateTag = typeof templateTags.$inferInsert;

