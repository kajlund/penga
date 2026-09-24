export const AccountType = {
  ASSET: 'ASSET',
  LIABILITY: 'LIABILITY',
  EQUITY: 'EQUITY',
  SETTLEMENT: 'SETTLEMENT',
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

export type AccountType = (typeof AccountType)[keyof typeof AccountType];

import type { SettlementPresentation } from './transaction-entry.js';

export interface Account {
  id: string;
  name: string;
  description?: string | null;
  type: AccountType;
  parentId: string | null;
  icon: string | null;
  color: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface AccountTreeNode extends Account {
  children: AccountTreeNode[];
}

export interface CreateAccountInput {
  name: string;
  description?: string | null;
  type: AccountType;
  parentId?: string | null;
  icon?: string | null;
  color?: string | null;
  initialBalanceCents?: number;
  initialBalanceDate?: string;
}

export interface UpdateAccountInput {
  name?: string;
  description?: string | null;
  type?: AccountType;
  parentId?: string | null;
  icon?: string | null;
  color?: string | null;
}

export interface Transaction {
  id: string;
  transactionDate: string;
  sortOrder: number;
  payee: string | null;
  isCleared: boolean;
  note: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Split {
  id: string;
  transactionId: string;
  accountId: string;
  amountCents: number;
  createdAt?: string | Date;
}

export interface SplitInput {
  accountId: string;
  amountCents: number;
}

export interface Tag {
  id: string;
  name: string;
  color?: string | null;
  createdAt?: string | Date;
}

export interface CreateTagInput {
  name: string;
  color?: string | null;
}

export interface TransactionWithSplits extends Transaction {
  splits: (Split & {
    accountName?: string;
    accountType?: AccountType;
    accountIcon?: string | null;
    accountColor?: string | null;
  })[];
  tags?: Tag[];
}

export interface CreateTransactionInput {
  transactionDate: string;
  sortOrder?: number;
  payee?: string | null;
  isCleared?: boolean;
  note?: string | null;
  splits: SplitInput[];
  tagIds?: string[];
}

export interface AccountBalanceSummary {
  id: string;
  name: string;
  description?: string | null;
  type: AccountType;
  parentId: string | null;
  icon: string | null;
  color: string | null;
  balanceCents: number;
  clearedBalanceCents: number;
  splitCount: number;
  rollupBalanceCents: number;
  settlementPresentation?: SettlementPresentation;
}

export interface DashboardSummary {
  totalAssetsCents: number;
  totalLiabilitiesCents: number;
  netAvailableCents: number;
  totalIncomeCents: number;
  totalExpensesCents: number;
  totalSettlementAssetsCents?: number;
  totalSettlementLiabilitiesCents?: number;
  accountBalances: AccountBalanceSummary[];
  recentTransactions: TransactionWithSplits[];
}

export interface UpdateTransactionInput {
  isCleared?: boolean;
  sortOrder?: number;
  payee?: string | null;
  note?: string | null;
  transactionDate?: string;
  splits?: SplitInput[];
  tagIds?: string[];
}

export interface ReorderTransactionsInput {
  items: { id: string; sortOrder: number }[];
}

export interface Budget {
  id: string;
  accountId: string;
  targetAmountCents: number;
  periodYear?: number | null;
  periodMonth?: number | null;
  notes?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface BudgetProgressItem {
  budgetId?: string | null;
  accountId: string;
  accountName: string;
  accountIcon?: string | null;
  accountColor?: string | null;
  targetAmountCents: number;
  actualSpentCents: number;
  remainingCents: number;
  progressPercent: number;
  projectedMonthEndCents: number;
  rolling3MonthAvgCents: number;
  rolling12MonthAvgCents: number;
  suggestedTargetCents: number;
  notes?: string | null;
}

export interface MonthlyBudgetReport {
  year: number;
  month: number;
  totalBudgetedCents: number;
  totalSpentCents: number;
  totalRemainingCents: number;
  overallProgressPercent: number;
  items: BudgetProgressItem[];
}

export interface SetBudgetInput {
  accountId: string;
  targetAmountCents: number;
  periodYear?: number | null;
  periodMonth?: number | null;
  notes?: string | null;
}

export interface TransactionTemplate {
  id: string;
  name: string;
  payee: string | null;
  note: string | null;
  icon: string | null;
  color: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface TemplateSplit {
  id: string;
  templateId: string;
  accountId: string;
  amountCents: number;
  sortOrder: number;
  createdAt?: string | Date;
}

export interface TemplateSplitInput {
  accountId: string;
  amountCents: number;
  sortOrder?: number;
}

export interface TransactionTemplateWithSplits extends TransactionTemplate {
  splits: (TemplateSplit & {
    accountName?: string;
    accountType?: AccountType;
    accountIcon?: string | null;
    accountColor?: string | null;
  })[];
  tags?: Tag[];
}

export interface CreateTransactionTemplateInput {
  name: string;
  payee?: string | null;
  note?: string | null;
  icon?: string | null;
  color?: string | null;
  splits: TemplateSplitInput[];
  tagIds?: string[];
}

export interface UpdateTransactionTemplateInput {
  name?: string;
  payee?: string | null;
  note?: string | null;
  icon?: string | null;
  color?: string | null;
  splits?: TemplateSplitInput[];
  tagIds?: string[];
}

export * from './transaction-entry.js';
