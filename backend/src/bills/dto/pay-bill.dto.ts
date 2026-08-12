import { IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class PayBillDto {
  /**
   * What was actually paid, when it differs from the billed amount — late
   * fees, a discount for early payment. The bill keeps its own amount; the
   * settlement transaction records reality.
   */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Amount must be greater than 0' })
  @Transform(({ value }) => parseFloat(value))
  amount?: number;

  /** When the payment happened; defaults to today. */
  @IsOptional()
  @IsDateString()
  paidDate?: string;
}
