import { IsOptional, IsUUID, IsIn, Matches } from 'class-validator';

export class BillFiltersDto {
  /** Restrict to a shared context; without it, bills the caller created. */
  @IsOptional()
  @IsUUID()
  contextId?: string;

  /** Calendar month the due date falls in, as YYYY-MM. */
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must be formatted as YYYY-MM' })
  month?: string;

  /** Defaults to open — the "what do I still owe" view. */
  @IsOptional()
  @IsIn(['open', 'paid', 'canceled', 'all'])
  status?: string;
}
