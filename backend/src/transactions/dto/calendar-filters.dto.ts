import { IsOptional, IsUUID, Matches } from 'class-validator';

export class CalendarFiltersDto {
  /** Calendar month to aggregate, as YYYY-MM. */
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must be formatted as YYYY-MM' })
  month: string;

  /** Restrict to a shared context; without it, the caller's own records. */
  @IsOptional()
  @IsUUID()
  contextId?: string;
}
