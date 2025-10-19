export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
}

export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export interface Transaction {
  id: string;
  contextId: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  categoryId?: string;
  subcategoryId?: string;
  date: Date;
  status: TransactionStatus;
  metadata?: Record<string, any>;
  telegramMessageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransactionDto {
  contextId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  categoryId?: string;
  subcategoryId?: string;
  date?: Date;
  metadata?: Record<string, any>;
  telegramMessageId?: string;
}

export interface UpdateTransactionDto {
  type?: TransactionType;
  amount?: number;
  currency?: string;
  description?: string;
  categoryId?: string;
  subcategoryId?: string;
  date?: Date;
  status?: TransactionStatus;
  metadata?: Record<string, any>;
}

export interface TransactionResponse extends Transaction {
  category?: {
    id: string;
    name: string;
    color: string;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
}