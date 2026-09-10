import { pgTable, uuid, text, pgEnum, timestamp, type AnyPgColumn } from 'drizzle-orm/pg-core';

export const accountTypeEnum = pgEnum('account_type', [
  'ASSET',
  'LIABILITY',
  'INCOME',
  'EXPENSE',
]);

export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  type: accountTypeEnum('type').notNull(),
  parentId: uuid('parent_id').references((): AnyPgColumn => accounts.id, {
    onDelete: 'cascade',
  }),
  icon: text('icon'),
  color: text('color'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
