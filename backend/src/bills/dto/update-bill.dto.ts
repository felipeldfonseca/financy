import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsOptional, IsIn } from 'class-validator';
import { CreateBillDto } from './create-bill.dto';
import { BillStatus } from '../entities/bill.entity';

/**
 * The context a bill lives in is fixed at creation, and 'paid' is deliberately
 * not settable here: paying goes through POST /bills/:id/pay so the settlement
 * transaction always exists. Setting an already-paid bill back to 'open'
 * reopens it (the payment link is cleared, the expense itself is kept).
 */
export class UpdateBillDto extends PartialType(OmitType(CreateBillDto, ['contextId'] as const)) {
  @IsOptional()
  @IsIn([BillStatus.OPEN, BillStatus.CANCELED])
  status?: BillStatus;
}
