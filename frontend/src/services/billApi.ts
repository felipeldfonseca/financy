import api from './api';
import { Transaction } from './transactionApi';

export type BillStatus = 'open' | 'paid' | 'canceled';

export interface Bill {
  id: string;
  description: string;
  amount: number;
  currency: string;
  /** Plain calendar date, YYYY-MM-DD. */
  dueDate: string;
  category?: string;
  dashboardCategory?: string;
  merchantName?: string;
  status: BillStatus;
  installmentNumber?: number;
  installmentTotal?: number;
  recurrenceRule?: string;
  paidAt?: string;
  paidTransactionId?: string;
  userId: string;
  contextId: string;
  createdAt: string;
  updatedAt: string;
  /** Derived by the server against its own (UTC) calendar; prefer isBillOverdue locally. */
  isOverdue: boolean;
}

export interface CreateBillData {
  description: string;
  amount: number;
  currency?: string;
  dueDate: string;
  category?: string;
  dashboardCategory?: string;
  merchantName?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  /** Shared context the bill belongs to; omitted for personal ones. */
  contextId?: string;
}

export interface UpdateBillData extends Partial<Omit<CreateBillData, 'contextId'>> {
  /** 'paid' is never set directly — paying goes through pay(). */
  status?: 'open' | 'canceled';
}

export interface BillFilters {
  contextId?: string;
  /** Calendar month the due date falls in, YYYY-MM. */
  month?: string;
  status?: BillStatus | 'all';
}

export interface PayBillData {
  /** What was actually paid, when it differs from the billed amount. */
  amount?: number;
  /** When the payment happened; the server defaults to today. */
  paidDate?: string;
}

export const billApi = {
  async list(filters?: BillFilters): Promise<Bill[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    const response = await api.get(`/bills?${params.toString()}`);
    return response.data;
  },

  async create(data: CreateBillData): Promise<Bill> {
    const response = await api.post('/bills', data);
    return response.data;
  },

  async update(id: string, data: UpdateBillData): Promise<Bill> {
    const response = await api.patch(`/bills/${id}`, data);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/bills/${id}`);
  },

  /** Settles the bill: the expense is recorded in the caller's own name. */
  async pay(id: string, data: PayBillData = {}): Promise<{ bill: Bill; transaction: Transaction }> {
    const response = await api.post(`/bills/${id}/pay`, data);
    return response.data;
  },
};
