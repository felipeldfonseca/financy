import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { Transaction } from './entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { Context } from '../contexts/entities/context.entity';
import { ContextMember } from '../contexts/entities/context-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, User, Context, ContextMember])],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}