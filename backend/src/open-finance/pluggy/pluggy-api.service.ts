import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

// Subset of Pluggy's API objects that the sync pipeline consumes.
// Reference: https://docs.pluggy.ai / https://api.pluggy.ai/docs

export interface PluggyConnector {
  id: number;
  name: string;
  imageUrl?: string;
  institutionUrl?: string;
  isSandbox?: boolean;
}

export type PluggyItemStatus =
  | 'UPDATED'
  | 'UPDATING'
  | 'WAITING_USER_INPUT'
  | 'LOGIN_ERROR'
  | 'OUTDATED'
  | 'ERROR';

export interface PluggyItem {
  id: string;
  status: PluggyItemStatus;
  executionStatus?: string;
  connector: PluggyConnector;
  error?: { code?: string; message?: string } | null;
  consentExpiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PluggyAccount {
  id: string;
  itemId: string;
  type: 'BANK' | 'CREDIT';
  subtype?: 'CHECKING_ACCOUNT' | 'SAVINGS_ACCOUNT' | 'CREDIT_CARD' | string;
  name: string;
  number?: string;
  balance: number;
  currencyCode: string;
}

export interface PluggyTransaction {
  id: string;
  accountId: string;
  date: string; // ISO datetime
  description: string;
  descriptionRaw?: string;
  amount: number; // signed; sign conventions differ per account type
  currencyCode: string;
  category?: string | null;
  type: 'DEBIT' | 'CREDIT';
  status?: 'PENDING' | 'POSTED';
  merchant?: { name?: string; businessName?: string } | null;
  paymentData?: Record<string, any> | null;
}

interface PageResponse<T> {
  results: T[];
  page: number;
  totalPages: number;
  total: number;
}

// Pluggy API keys are valid for 2 hours; refresh comfortably before that.
const API_KEY_TTL_MS = 90 * 60 * 1000;
const TRANSACTIONS_PAGE_SIZE = 500;

@Injectable()
export class PluggyApiService {
  private readonly logger = new Logger(PluggyApiService.name);
  private apiKey: string | null = null;
  private apiKeyFetchedAt = 0;
  // Overridable so tests and offline dev can point at a local mock
  // (see backend/test/mock-pluggy-server.js).
  private readonly baseUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get('PLUGGY_BASE_URL', 'https://api.pluggy.ai');
  }

  isConfigured(): boolean {
    return Boolean(
      this.configService.get('PLUGGY_CLIENT_ID') &&
        this.configService.get('PLUGGY_CLIENT_SECRET'),
    );
  }

  assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Open Finance is not configured (missing PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET)',
      );
    }
  }

  /**
   * Short-lived token the frontend uses to open the Pluggy Connect widget.
   * One token per connection attempt (30-minute TTL on Pluggy's side).
   */
  async createConnectToken(options: {
    itemId?: string;
    clientUserId?: string;
  } = {}): Promise<{ accessToken: string }> {
    const body: Record<string, any> = {};
    if (options.itemId) {
      body.itemId = options.itemId; // reconnect/update an existing item
    }
    if (options.clientUserId) {
      body.clientUserId = options.clientUserId;
    }
    const webhookUrl = this.configService.get('PLUGGY_WEBHOOK_URL');
    if (webhookUrl) {
      body.options = { webhookUrl };
    }

    return this.request<{ accessToken: string }>('POST', '/connect_token', body);
  }

  async getItem(itemId: string): Promise<PluggyItem> {
    return this.request<PluggyItem>('GET', `/items/${itemId}`);
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.request('DELETE', `/items/${itemId}`);
  }

  async getAccounts(itemId: string): Promise<PluggyAccount[]> {
    const response = await this.request<PageResponse<PluggyAccount>>(
      'GET',
      '/accounts',
      undefined,
      { itemId },
    );
    return response.results;
  }

  /**
   * Fetches every transaction page for an account. `from` (YYYY-MM-DD)
   * bounds the window for incremental syncs; omitted on the first sync so
   * Pluggy returns everything the Open Finance consent covers (12 months).
   */
  async getAllTransactions(
    accountId: string,
    from?: string,
  ): Promise<PluggyTransaction[]> {
    const transactions: PluggyTransaction[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const params: Record<string, any> = {
        accountId,
        pageSize: TRANSACTIONS_PAGE_SIZE,
        page,
      };
      if (from) {
        params.from = from;
      }

      const response = await this.request<PageResponse<PluggyTransaction>>(
        'GET',
        '/transactions',
        undefined,
        params,
      );
      transactions.push(...response.results);
      totalPages = response.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages);

    return transactions;
  }

  private async authenticate(): Promise<string> {
    this.assertConfigured();

    const response = await lastValueFrom(
      this.httpService.post(`${this.baseUrl}/auth`, {
        clientId: this.configService.get('PLUGGY_CLIENT_ID'),
        clientSecret: this.configService.get('PLUGGY_CLIENT_SECRET'),
      }),
    );

    this.apiKey = response.data.apiKey;
    this.apiKeyFetchedAt = Date.now();
    return this.apiKey;
  }

  private async getApiKey(): Promise<string> {
    if (this.apiKey && Date.now() - this.apiKeyFetchedAt < API_KEY_TTL_MS) {
      return this.apiKey;
    }
    return this.authenticate();
  }

  private async request<T = any>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    data?: any,
    params?: Record<string, any>,
    isRetry = false,
  ): Promise<T> {
    const apiKey = await this.getApiKey();

    try {
      const response = await lastValueFrom(
        this.httpService.request<T>({
          method,
          url: `${this.baseUrl}${path}`,
          data,
          params,
          headers: { 'X-API-KEY': apiKey },
        }),
      );
      return response.data;
    } catch (error) {
      const status = error?.response?.status;
      // Expired API key → re-authenticate once and retry.
      if ((status === 401 || status === 403) && !isRetry) {
        this.apiKey = null;
        return this.request<T>(method, path, data, params, true);
      }
      this.logger.error(
        `Pluggy ${method} ${path} failed: ${status || error.message}`,
        error?.response?.data ? JSON.stringify(error.response.data) : undefined,
      );
      throw error;
    }
  }
}
