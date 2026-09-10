export const AccountType = {
  ASSET: 'ASSET',
  LIABILITY: 'LIABILITY',
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export interface Account {
  id: string;
  name: string;
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
  type: AccountType;
  parentId?: string | null;
  icon?: string | null;
  color?: string | null;
}

export interface UpdateAccountInput {
  name?: string;
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
}

export interface Split {
  id: string;
  transactionId: string;
  accountId: string;
  amountCents: number;
}
