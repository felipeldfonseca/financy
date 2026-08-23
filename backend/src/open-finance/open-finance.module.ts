import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Transaction } from '../transactions/entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { ContextMember } from '../contexts/entities/context-member.entity';
import { CurrencyModule } from '../currency/currency.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { BankConnection } from './entities/bank-connection.entity';
import { BankAccount } from './entities/bank-account.entity';
import { OpenFinanceController } from './open-finance.controller';
import { OpenFinanceWebhookController } from './open-finance-webhook.controller';
import { OpenFinanceService } from './open-finance.service';
import { OpenFinanceSyncService } from './services/open-finance-sync.service';
import { OpenFinanceSchedulerService } from './services/open-finance-scheduler.service';
import { CategoryMappingService } from './services/category-mapping.service';
import { PluggyApiService } from './pluggy/pluggy-api.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BankConnection,
      BankAccount,
      Transaction,
      User,
      ContextMember,
    ]),
    HttpModule,
    CurrencyModule,
    TransactionsModule,
  ],
  controllers: [OpenFinanceController, OpenFinanceWebhookController],
  providers: [
    OpenFinanceService,
    OpenFinanceSyncService,
    OpenFinanceSchedulerService,
    CategoryMappingService,
    PluggyApiService,
  ],
  exports: [OpenFinanceService],
})
export class OpenFinanceModule {}
