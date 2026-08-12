import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillsService } from './bills.service';
import { BillsController } from './bills.controller';
import { Bill } from './entities/bill.entity';
import { User } from '../users/entities/user.entity';
import { ContextMember } from '../contexts/entities/context-member.entity';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bill, User, ContextMember]),
    // Paying a bill records the settlement through the transactions service,
    // so every rule it enforces (permissions, currency conversion) applies.
    TransactionsModule,
  ],
  controllers: [BillsController],
  providers: [BillsService],
  exports: [BillsService],
})
export class BillsModule {}
