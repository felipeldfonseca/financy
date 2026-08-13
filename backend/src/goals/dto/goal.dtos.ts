import {
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  IsHexColor,
  IsIn,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { GoalStatus, GoalType } from '../entities/goal.entity';

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
