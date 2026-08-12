import {
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
  IsUUID,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { VALID_DASHBOARD_CATEGORIES } from '../../transactions/constants/categories.constants';

export class CreateBillDto {
  @IsString()
  @MaxLength(500)
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Amount must be greater than 0' })
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  // Bills are money going out, so only expense categories apply.
  @IsOptional()
  @IsString()
  @IsIn(VALID_DASHBOARD_CATEGORIES.expense, { message: 'Invalid dashboard category' })
  dashboardCategory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  merchantName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  installmentNumber?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  installmentTotal?: number;

  // Paying a recurring bill creates the next occurrence automatically.
  @IsOptional()
  @IsString()
  @IsIn(['weekly', 'monthly', 'yearly'], { message: 'recurrenceRule must be weekly, monthly or yearly' })
  recurrenceRule?: string;

  @IsOptional()
  @IsUUID()
  contextId?: string;
}
