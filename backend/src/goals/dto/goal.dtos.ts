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
import { GoalStatus } from '../entities/goal.entity';

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Target amount must be greater than 0' })
  @Transform(({ value }) => parseFloat(value))
  targetAmount: number;

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
