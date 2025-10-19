import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateTransactionDto } from './create-transaction.dto';
import { TransactionStatus } from '../entities/transaction.entity';

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;
}