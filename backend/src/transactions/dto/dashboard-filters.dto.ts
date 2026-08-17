import { IsDateString, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class MonthlySummaryFiltersDto {
  /** How many months back, current one included. Defaults to 6. */
  @IsOptional()
  @Transform(({ value }) => (value == null || value === '' ? undefined : parseInt(value, 10)))
  @IsInt()
  @Min(1)
  @Max(24)
  months?: number;

  /** Restrict to a shared context; without it, the caller's own records. */
  @IsOptional()
  @IsUUID()
  contextId?: string;
}

export class MemberSpendingFiltersDto {
  /** The shared context to break down — required: alone there is no "who". */
  @IsUUID()
  contextId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
