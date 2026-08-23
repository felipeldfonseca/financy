import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContextMember, MemberStatus } from '../contexts/entities/context-member.entity';
import { TransactionsService } from '../transactions/transactions.service';
import { BankConnection, ConnectionStatus } from './entities/bank-connection.entity';
import { PluggyApiService } from './pluggy/pluggy-api.service';
import { OpenFinanceSyncService, SyncResult } from './services/open-finance-sync.service';
import { CreateConnectionDto } from './dto/create-connection.dto';

export interface PluggyWebhookEvent {
  event?: string;
  itemId?: string;
  id?: string;
  [key: string]: any;
}

@Injectable()
export class OpenFinanceService {
  private readonly logger = new Logger(OpenFinanceService.name);

  constructor(
    @InjectRepository(BankConnection)
    private connectionsRepository: Repository<BankConnection>,
    @InjectRepository(ContextMember)
    private contextMembersRepository: Repository<ContextMember>,
    private pluggyApi: PluggyApiService,
    private syncService: OpenFinanceSyncService,
    private transactionsService: TransactionsService,
  ) {}

  isEnabled(): boolean {
    return this.pluggyApi.isConfigured();
  }

  /** Token the frontend uses to open the Pluggy Connect widget. */
  async createConnectToken(userId: string): Promise<{ accessToken: string }> {
    this.pluggyApi.assertConfigured();
    return this.pluggyApi.createConnectToken({ clientUserId: userId });
  }

  /**
   * Called by the frontend after the Connect widget finishes with an itemId.
   * Registers the connection and kicks off the first (full-history) sync in
   * the background.
   */
  async registerConnection(
    userId: string,
    dto: CreateConnectionDto,
  ): Promise<BankConnection> {
    this.pluggyApi.assertConfigured();

    // Same webhook/duplicate-click can register the same item twice; keep it
    // idempotent by returning the existing connection.
    const existing = await this.connectionsRepository.findOne({
      where: { providerItemId: dto.itemId },
    });
    if (existing) {
      if (existing.userId !== userId) {
        throw new ForbiddenException('This bank connection belongs to another user');
      }
      return existing;
    }

    let contextId = dto.contextId || null;
    if (contextId) {
      const membership = await this.contextMembersRepository.findOne({
        where: { contextId, userId, status: MemberStatus.ACTIVE },
      });
      if (!membership || !membership.canEditTransactions()) {
        throw new ForbiddenException(
          'You do not have permission to file transactions in this context',
        );
      }
    } else {
      contextId = await this.transactionsService.getOrCreateDefaultContext(userId);
    }

    const item = await this.pluggyApi.getItem(dto.itemId);

    const connection = this.connectionsRepository.create({
      providerItemId: dto.itemId,
      userId,
      contextId,
    });
    this.syncService.applyItemState(connection, item);
    const saved = await this.connectionsRepository.save(connection);

    // First sync runs in the background so the widget's success screen isn't
    // blocked behind a 12-month history import.
    this.syncService.syncConnection(saved).catch(error => {
      this.logger.error(
        `Initial sync failed for connection ${saved.id}: ${error.message}`,
      );
    });

    return saved;
  }

  async listConnections(userId: string): Promise<BankConnection[]> {
    return this.connectionsRepository.find({
      where: { userId },
      relations: ['accounts'],
      order: { createdAt: 'DESC' },
    });
  }

  async syncNow(userId: string, connectionId: string): Promise<SyncResult> {
    const connection = await this.getOwnedConnection(userId, connectionId);
    return this.syncService.syncConnection(connection);
  }

  /**
   * Disconnects a bank: deletes the aggregator item (which revokes the data
   * link on the provider side) and removes the local connection. Imported
   * transactions are kept — they are the user's records — with accountId set
   * to NULL by the FK.
   */
  async disconnect(userId: string, connectionId: string): Promise<void> {
    const connection = await this.getOwnedConnection(userId, connectionId);

    try {
      await this.pluggyApi.deleteItem(connection.providerItemId);
    } catch (error) {
      // A 404 means the item is already gone on Pluggy's side; anything else
      // still must not leave the user unable to disconnect locally.
      if (error?.response?.status !== 404) {
        this.logger.warn(
          `Could not delete Pluggy item ${connection.providerItemId}: ${error.message}`,
        );
      }
    }

    await this.connectionsRepository.remove(connection);
  }

  /**
   * Webhook entry point. Pluggy notifications carry event + itemId; payload
   * contents are treated as untrusted hints — all data is re-fetched from the
   * API with our credentials, never taken from the webhook body.
   */
  async handleWebhookEvent(payload: PluggyWebhookEvent): Promise<void> {
    const itemId = payload?.itemId || payload?.id;
    const event = payload?.event || 'unknown';

    if (!itemId) {
      this.logger.warn(`Webhook without itemId ignored (event=${event})`);
      return;
    }

    const connection = await this.connectionsRepository.findOne({
      where: { providerItemId: itemId },
    });
    if (!connection) {
      this.logger.warn(`Webhook for unknown item ${itemId} ignored (event=${event})`);
      return;
    }

    this.logger.log(`Webhook event=${event} item=${itemId} connection=${connection.id}`);

    if (event === 'item/deleted') {
      connection.status = ConnectionStatus.ERROR;
      connection.lastError = 'Item deleted at provider';
      await this.connectionsRepository.save(connection);
      return;
    }

    // item/updated, item/created, item/error, transactions/created, ... —
    // syncConnection re-reads item status and handles each state correctly.
    await this.syncService.syncConnection(connection);
  }

  private async getOwnedConnection(
    userId: string,
    connectionId: string,
  ): Promise<BankConnection> {
    const connection = await this.connectionsRepository.findOne({
      where: { id: connectionId },
    });
    if (!connection) {
      throw new NotFoundException('Bank connection not found');
    }
    if (connection.userId !== userId) {
      throw new ForbiddenException('This bank connection belongs to another user');
    }
    return connection;
  }
}
