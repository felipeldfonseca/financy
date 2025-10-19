import api from './api';

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  type: 'expense' | 'income' | 'transfer';
  category?: string;
  subcategory?: string;
  currency: string;
  date: string;
  time?: string;
  merchantName?: string;
  location?: string;
  notes?: string;
  receiptUrl?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  inputMethod: 'manual' | 'telegram' | 'voice' | 'ocr' | 'api';
  metadata?: Record<string, any>;
  originalText?: string;
  isRecurring: boolean;
  recurringPattern?: string;
  exchangeRate?: number;
  originalAmount?: number;
  originalCurrency?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionData {
  amount: number;
  description: string;
  type: 'expense' | 'income' | 'transfer';
  category?: string;
  subcategory?: string;
  currency?: string;
  date?: string;
  time?: string;
  merchantName?: string;
  location?: string;
  notes?: string;
  receiptUrl?: string;
  inputMethod?: 'manual' | 'telegram' | 'voice' | 'ocr' | 'api';
  metadata?: Record<string, any>;
  originalText?: string;
  isRecurring?: boolean;
  recurringPattern?: string;
  exchangeRate?: number;
  originalAmount?: number;
  originalCurrency?: string;
}

export interface UpdateTransactionData extends Partial<CreateTransactionData> {
  status?: 'pending' | 'confirmed' | 'cancelled';
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: 'expense' | 'income' | 'transfer';
  status?: 'pending' | 'confirmed' | 'cancelled';
  category?: string;
  subcategory?: string;
  currency?: string;
  merchantName?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'amount' | 'description' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  transactionCount: number;
  categories: Array<{
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
}

export interface PaginatedTransactions {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: TransactionSummary;
}

export const transactionApi = {
  async getTransactions(filters?: TransactionFilters): Promise<PaginatedTransactions> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const response = await api.get(`/transactions?${params.toString()}`);
    return response.data;
  },

  async getTransaction(id: string): Promise<Transaction> {
    const response = await api.get(`/transactions/${id}`);
    return response.data;
  },

  async createTransaction(data: CreateTransactionData): Promise<Transaction> {
    const response = await api.post('/transactions', data);
    return response.data;
  },

  async updateTransaction(id: string, data: UpdateTransactionData): Promise<Transaction> {
    const response = await api.patch(`/transactions/${id}`, data);
    return response.data;
  },

  async deleteTransaction(id: string): Promise<void> {
    await api.delete(`/transactions/${id}`);
  },

  async confirmTransaction(id: string): Promise<Transaction> {
    const response = await api.post(`/transactions/${id}/confirm`);
    return response.data;
  },

  async cancelTransaction(id: string): Promise<Transaction> {
    const response = await api.post(`/transactions/${id}/cancel`);
    return response.data;
  },

  async getCategories(): Promise<string[]> {
    const response = await api.get('/transactions/categories');
    return response.data;
  },

  async getMerchants(): Promise<string[]> {
    const response = await api.get('/transactions/merchants');
    return response.data;
  },
};