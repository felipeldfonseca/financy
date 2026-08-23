import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BankConnection, ConnectionStatus } from '../entities/bank-connection.entity';
import { OpenFinanceSyncService } from './open-finance-sync.service';
import { PluggyApiService } from '../pluggy/pluggy-api.service';

@Injectable()
export class OpenFinanceSchedulerService {
  private readonly logger = new Logger(OpenFinanceSchedulerService.name);

  constructor(
    @InjectRepository(BankConnection)
    private connectionsRepository: Repository<BankConnection>,
    private syncService: OpenFinanceSyncService,
    private pluggyApi: PluggyApiService,
  ) {}

  /**
   * Daily reconciliation sweep (09:00 UTC = early morning in Brazil): catches
   * webhooks that never arrived, refreshes balances and consent status. Webhook
   * events remain the primary sync trigger.
   */
  @Cron('0 9 * * *')
  async dailySweep(): Promise<void> {
    if (!this.pluggyApi.isConfigured()) {
      return;
    }

    const connections = await this.connectionsRepository.find({
      where: {
        status: In([
          ConnectionStatus.CONNECTED,
          ConnectionStatus.UPDATING,
          ConnectionStatus.LOGIN_ERROR,
        ]),
      },
    });

    this.logger.log(`Daily sweep: syncing ${connections.length} connections`);

    for (const connection of connections) {
      try {
        await this.syncService.syncConnection(connection);
      } catch (error) {
        this.logger.error(
          `Daily sweep failed for connection ${connection.id}: ${error.message}`,
        );
      }
    }
  }
}
