import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  InputMethod,
} from '../../transactions/entities/transaction.entity';
import { User } from '../../users/entities/user.entity';
import { CurrencyService } from '../../currency/currency.service';
import {
  BankConnection,
  ConnectionStatus,
} from '../entities/bank-connection.entity';
import { BankAccount, BankAccountType } from '../entities/bank-account.entity';
import {
  PluggyApiService,
  PluggyAccount,
  PluggyItem,
  PluggyTransaction,
} from '../pluggy/pluggy-api.service';
import { CategoryMappingService } from './category-mapping.service';

export interface SyncResult {
  connectionId: string;
  status: ConnectionStatus;
  accountsSynced: number;
  transactionsImported: number;
  transactionsSkipped: number;
}

// Incremental syncs re-fetch a few days behind the last sync so transactions
// that settle late (weekends, card batches) are still picked up; the unique
// (accountId, providerTransactionId) index makes the overlap harmless.
const INCREMENTAL_OVERLAP_DAYS = 7;

@Injectable()
export class OpenFinanceSyncService {
  private readonly logger = new Logger(OpenFinanceSyncService.name);

  constructor(
    @InjectRepository(BankConnection)
    private connectionsRepository: Repository<BankConnection>,
    @InjectRepository(BankAccount)
    private accountsRepository: Repository<BankAccount>,
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private pluggyApi: PluggyApiService,
    private categoryMapping: CategoryMappingService,
    private currencyService: CurrencyService,
  ) {}

  async syncConnection(connection: BankConnection): Promise<SyncResult> {
    const result: SyncResult = {
      connectionId: connection.id,
      status: connection.status,
      accountsSynced: 0,
      transactionsImported: 0,
      transactionsSkipped: 0,
    };

    const item = await this.pluggyApi.getItem(connection.providerItemId);
    this.applyItemState(connection, item);

    if (!this.isSyncableStatus(connection.status)) {
      await this.connectionsRepository.save(connection);
      result.status = connection.status;
      this.logger.warn(
        `Connection ${connection.id} not syncable (status=${connection.status}, detail=${connection.lastError || 'n/a'})`,
      );
      return result;
    }

    const user = await this.usersRepository.findOne({
      where: { id: connection.userId },
    });
    if (!user) {
      this.logger.error(`Connection ${connection.id} has no owner; skipping sync`);
      return result;
    }

    const isFirstSync = !connection.lastSyncedAt;
    const from = isFirstSync ? undefined : this.incrementalFromDate(connection.lastSyncedAt);

    const providerAccounts = await this.pluggyApi.getAccounts(connection.providerItemId);
    for (const providerAccount of providerAccounts) {
      const account = await this.upsertAccount(connection, providerAccount);
      result.accountsSynced += 1;

      const providerTransactions = await this.pluggyApi.getAllTransactions(
        providerAccount.id,
        from,
      );
      const { imported, skipped } = await this.importTransactions(
        connection,
        account,
        user,
        providerTransactions,
      );
      result.transactionsImported += imported;
      result.transactionsSkipped += skipped;
    }

    connection.lastSyncedAt = new Date();
    connection.lastError = null;
    await this.connectionsRepository.save(connection);
    result.status = connection.status;

    this.logger.log(
      `Synced connection ${connection.id} (${connection.institutionName}): ` +
        `${result.accountsSynced} accounts, +${result.transactionsImported} transactions, ` +
        `${result.transactionsSkipped} duplicates skipped`,
    );
    return result;
  }

  /** Maps Pluggy item status onto the connection and stores error detail. */
  applyItemState(connection: BankConnection, item: PluggyItem): void {
    connection.institutionId = item.connector ? String(item.connector.id) : connection.institutionId;
    connection.institutionName = item.connector?.name || connection.institutionName;
    connection.institutionImageUrl = item.connector?.imageUrl || connection.institutionImageUrl;
    connection.consentExpiresAt = item.consentExpiresAt
      ? new Date(item.consentExpiresAt)
      : connection.consentExpiresAt;

    switch (item.status) {
      case 'UPDATED':
        connection.status = ConnectionStatus.CONNECTED;
        break;
      case 'UPDATING':
        connection.status = ConnectionStatus.UPDATING;
        break;
      case 'LOGIN_ERROR':
      case 'WAITING_USER_INPUT':
        connection.status = ConnectionStatus.LOGIN_ERROR;
        break;
      case 'OUTDATED':
      case 'ERROR':
      default:
        connection.status = ConnectionStatus.ERROR;
        break;
    }

    if (
      connection.consentExpiresAt &&
      connection.consentExpiresAt.getTime() < Date.now()
    ) {
      connection.status = ConnectionStatus.CONSENT_EXPIRED;
    }

    connection.lastError = item.error?.message || null;
  }

  private isSyncableStatus(status: ConnectionStatus): boolean {
    // UPDATING is syncable: Pluggy serves the data it already has while it
    // refreshes, and the next webhook triggers another pass anyway.
    return (
      status === ConnectionStatus.CONNECTED || status === ConnectionStatus.UPDATING
    );
  }

  private incrementalFromDate(lastSyncedAt: Date): string {
    const from = new Date(lastSyncedAt);
    from.setDate(from.getDate() - INCREMENTAL_OVERLAP_DAYS);
    return from.toISOString().slice(0, 10);
  }

  private async upsertAccount(
    connection: BankConnection,
    providerAccount: PluggyAccount,
  ): Promise<BankAccount> {
    let account = await this.accountsRepository.findOne({
      where: {
        connectionId: connection.id,
        providerAccountId: providerAccount.id,
      },
    });

    if (!account) {
      account = this.accountsRepository.create({
        connectionId: connection.id,
        providerAccountId: providerAccount.id,
      });
    }

    account.type = this.mapAccountType(providerAccount);
    account.name = providerAccount.name;
    account.maskedNumber = providerAccount.number || null;
    account.currency = providerAccount.currencyCode || 'BRL';
    account.balance = providerAccount.balance;
    account.balanceUpdatedAt = new Date();

    return this.accountsRepository.save(account);
  }

  private mapAccountType(providerAccount: PluggyAccount): BankAccountType {
    if (providerAccount.type === 'CREDIT') {
      return BankAccountType.CREDIT_CARD;
    }
    if (providerAccount.subtype === 'SAVINGS_ACCOUNT') {
      return BankAccountType.SAVINGS;
    }
    if (providerAccount.subtype === 'CHECKING_ACCOUNT') {
      return BankAccountType.CHECKING;
    }
    return BankAccountType.UNKNOWN;
  }

  private async importTransactions(
    connection: BankConnection,
    account: BankAccount,
    user: User,
    providerTransactions: PluggyTransaction[],
  ): Promise<{ imported: number; skipped: number }> {
    if (providerTransactions.length === 0) {
      return { imported: 0, skipped: 0 };
    }

    // Dedupe pass 1: skip ids we already imported for this account.
    const providerIds = providerTransactions.map(tx => tx.id);
    const existing = await this.transactionsRepository.find({
      select: ['providerTransactionId'],
      where: {
        accountId: account.id,
        providerTransactionId: In(providerIds),
      },
    });
    const existingIds = new Set(existing.map(tx => tx.providerTransactionId));

    let imported = 0;
    let skipped = existingIds.size;

    for (const providerTx of providerTransactions) {
      if (existingIds.has(providerTx.id)) {
        continue;
      }

      try {
        const transaction = await this.mapTransaction(
          connection,
          account,
          user,
          providerTx,
        );
        await this.transactionsRepository.save(transaction);
        imported += 1;
      } catch (error) {
        // Dedupe pass 2: the partial unique index on (accountId,
        // providerTransactionId) is the real guarantee — a concurrent webhook
        // sync inserting the same row lands here as a 23505 and is skipped.
        if (error?.code === '23505') {
          skipped += 1;
          continue;
        }
        this.logger.error(
          `Failed to import transaction ${providerTx.id} (account ${account.id}): ${error.message}`,
        );
      }
    }

    return { imported, skipped };
  }

  private async mapTransaction(
    connection: BankConnection,
    account: BankAccount,
    user: User,
    providerTx: PluggyTransaction,
  ): Promise<Transaction> {
    const mapped = this.categoryMapping.map(
      providerTx.category,
      providerTx.description,
      providerTx.type,
    );

    const absoluteAmount = Math.abs(providerTx.amount);
    const transactionCurrency = providerTx.currencyCode || account.currency || 'BRL';
    const userPreferredCurrency = user.defaultCurrency || 'USD';

    // Same storage convention as TransactionsService.create: amount is stored
    // in the user's preferred currency; the bank's original value is kept in
    // originalAmount/originalCurrency with the applied rate.
    let amount = absoluteAmount;
    let exchangeRate = 1.0;
    if (transactionCurrency !== userPreferredCurrency) {
      const conversion = await this.currencyService.convertCurrency(
        absoluteAmount,
        transactionCurrency,
        userPreferredCurrency,
      );
      amount = conversion.convertedAmount;
      exchangeRate = conversion.exchangeRate;
    }

    const txDate = new Date(providerTx.date);

    return this.transactionsRepository.create({
      amount,
      description: providerTx.description || 'Bank transaction',
      type: mapped.type,
      category: mapped.category,
      dashboardCategory: mapped.dashboardCategory,
      currency: userPreferredCurrency,
      originalAmount: absoluteAmount,
      originalCurrency: transactionCurrency,
      exchangeRate,
      date: txDate,
      time: txDate.toISOString().slice(11, 19),
      merchantName: providerTx.merchant?.name || providerTx.merchant?.businessName || null,
      // Bank data is authoritative — no user confirmation step, unlike
      // AI-parsed Telegram messages which start as PENDING.
      status: TransactionStatus.CONFIRMED,
      inputMethod: InputMethod.OPEN_FINANCE,
      userId: connection.userId,
      contextId: connection.contextId || null,
      accountId: account.id,
      providerTransactionId: providerTx.id,
      metadata: {
        provider: connection.provider,
        providerItemId: connection.providerItemId,
        providerCategory: providerTx.category || null,
        providerType: providerTx.type,
        providerStatus: providerTx.status || null,
        rawAmount: providerTx.amount,
      },
    });
  }
}
