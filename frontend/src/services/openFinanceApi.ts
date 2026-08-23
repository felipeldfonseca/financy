import api from './api';

export type ConnectionStatus =
  | 'connected'
  | 'updating'
  | 'login_error'
  | 'consent_expired'
  | 'error';

export interface BankAccount {
  id: string;
  providerAccountId: string;
  type: 'checking' | 'savings' | 'credit_card' | 'unknown';
  name: string | null;
  maskedNumber: string | null;
  currency: string;
  balance: number | null;
  balanceUpdatedAt: string | null;
}

export interface BankConnection {
  id: string;
  provider: 'pluggy';
  providerItemId: string;
  institutionId: string | null;
  institutionName: string | null;
  institutionImageUrl: string | null;
  status: ConnectionStatus;
  consentExpiresAt: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  contextId: string | null;
  accounts: BankAccount[];
  createdAt: string;
  updatedAt: string;
}

export interface SyncResult {
  connectionId: string;
  status: ConnectionStatus;
  accountsSynced: number;
  transactionsImported: number;
  transactionsSkipped: number;
}

export const openFinanceApi = {
  async getStatus(): Promise<{ enabled: boolean }> {
    const response = await api.get('/open-finance/status');
    return response.data;
  },

  async createConnectToken(): Promise<{ accessToken: string }> {
    const response = await api.post('/open-finance/connect-token');
    return response.data;
  },

  async registerConnection(itemId: string, contextId?: string): Promise<BankConnection> {
    const response = await api.post('/open-finance/connections', { itemId, contextId });
    return response.data;
  },

  async listConnections(): Promise<BankConnection[]> {
    const response = await api.get('/open-finance/connections');
    return response.data;
  },

  async syncConnection(connectionId: string): Promise<SyncResult> {
    const response = await api.post(`/open-finance/connections/${connectionId}/sync`);
    return response.data;
  },

  async disconnect(connectionId: string): Promise<void> {
    await api.delete(`/open-finance/connections/${connectionId}`);
  },
};
