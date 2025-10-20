import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { MessageProcessorService } from './message-processor.service';
import { ContextDetectionService } from './context-detection.service';
import { ContextSetupService } from './context-setup.service';
import { User } from '../users/entities/user.entity';
import { ChatContext } from './entities/chat-context.entity';
import { ContextMember } from '../contexts/entities/context-member.entity';
import { TransactionsModule } from '../transactions/transactions.module';
import { ContextsModule } from '../contexts/contexts.module';
import { CurrencyModule } from '../currency/currency.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([User, ChatContext, ContextMember]),
    TransactionsModule,
    ContextsModule,
    CurrencyModule,
    UsersModule,
  ],
  controllers: [TelegramController],
  providers: [TelegramService, MessageProcessorService, ContextDetectionService, ContextSetupService],
  exports: [TelegramService, ContextDetectionService, ContextSetupService],
})
export class TelegramModule {}