import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  IsHexColor,
  IsIn,
  IsUUID,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { GoalStatus, GoalType, GrowthRatePeriod } from '../entities/goal.entity';

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  /** Defaults to 'target' (an event goal); which amounts are required follows. */
  @IsOptional()
  @IsIn([GoalType.TARGET, GoalType.RECURRING])
  goalType?: GoalType;

  // Required for event goals, optional finish line for monthly habits —
  // enforced in the service where the goal type is known.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Target amount must be greater than 0' })
  @Transform(({ value }) => (value == null || value === '' ? undefined : parseFloat(value)))
  targetAmount?: number;

  /** The monthly deposit a habit commits to; required for recurring goals. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Monthly target must be greater than 0' })
  @Transform(({ value }) => (value == null || value === '' ? undefined : parseFloat(value)))
  monthlyTarget?: number;

  /**
   * Expected growth rate in %, in the period below. Used only for
   * projections; zero means "project without yield", same as leaving it out.
   * The period-aware ceiling (50% a.m. / 500% a.a.) lives in the service,
   * where the merged period is known.
   */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0, { message: 'Growth rate cannot be negative' })
  @Max(500, { message: 'Growth rate must be at most 500%' })
  @Transform(({ value }) => (value == null || value === '' ? undefined : parseFloat(value)))
  expectedGrowthRate?: number;

  /** Whether the rate above is % per month or % per year; defaults to yearly. */
  @IsOptional()
  @IsIn([GrowthRatePeriod.MONTHLY, GrowthRatePeriod.YEARLY])
  growthRatePeriod?: GrowthRatePeriod;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsUUID()
  contextId?: string;
}

/** The context a goal lives in is fixed at creation, like a bill's. */
export class UpdateGoalDto extends PartialType(OmitType(CreateGoalDto, ['contextId'] as const)) {
  @IsOptional()
  @IsIn([GoalStatus.ACTIVE, GoalStatus.ARCHIVED])
  status?: GoalStatus;
}

export class GoalFiltersDto {
  @IsOptional()
  @IsUUID()
  contextId?: string;

  /** Defaults to active — the goals still being saved for. */
  @IsOptional()
  @IsIn(['active', 'archived', 'all'])
  status?: string;
}

export class ContributeDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Contribution must be greater than 0' })
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  /** When the money was put aside; defaults to today. */
  @IsOptional()
  @IsDateString()
  date?: string;
}

/** A ± balance correction — yield, a loss, a recount. Not a deposit. */
export class AdjustBalanceDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  /** Why the balance moved; shows up in the trail next to the "≈" mark. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;

  /** When it happened; defaults to today. */
  @IsOptional()
  @IsDateString()
  date?: string;
}

/** The caller's goals in the order they should list — first three reach the dashboard. */
export class ReorderGoalsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  goalIds: string[];
}
