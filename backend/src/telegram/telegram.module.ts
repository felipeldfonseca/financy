import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { BillReminderService } from './bill-reminder.service';
import { GoalReminderService } from './goal-reminder.service';
import { DatabaseBackupService } from './database-backup.service';
import { MessageProcessorService } from './message-processor.service';
import { ContextDetectionService } from './context-detection.service';
import { ContextSetupService } from './context-setup.service';
import { User } from '../users/entities/user.entity';
import { ChatContext } from './entities/chat-context.entity';
import { ContextMember } from '../contexts/entities/context-member.entity';
import { Bill } from '../bills/entities/bill.entity';
import { Goal } from '../goals/entities/goal.entity';
import { GoalsModule } from '../goals/goals.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { BillsModule } from '../bills/bills.module';
import { ContextsModule } from '../contexts/contexts.module';
import { CurrencyModule } from '../currency/currency.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([User, ChatContext, ContextMember, Bill, Goal]),
    TransactionsModule,
    BillsModule,
    GoalsModule,
    ContextsModule,
    CurrencyModule,
    UsersModule,
  ],
  controllers: [TelegramController],
  providers: [TelegramService, BillReminderService, GoalReminderService, DatabaseBackupService, MessageProcessorService, ContextDetectionService, ContextSetupService],
  exports: [TelegramService, ContextDetectionService, ContextSetupService],
})
export class TelegramModule {}