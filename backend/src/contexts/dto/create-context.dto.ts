import { IsString, IsOptional, IsEnum, IsNotEmpty, MaxLength, IsHexColor } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContextType, ContextVisibility } from '../entities/context.entity';

export class CreateContextDto {
  @ApiProperty({
    description: 'Name of the context',
    example: 'Family Budget',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the context',
    example: 'Shared budget for family expenses',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Type of context',
    enum: ContextType,
    example: ContextType.FAMILY,
  })
  @IsEnum(ContextType)
  type: ContextType;

  @ApiPropertyOptional({
    description: 'Visibility setting for the context',
    enum: ContextVisibility,
    example: ContextVisibility.INVITE_ONLY,
  })
  @IsEnum(ContextVisibility)
  @IsOptional()
  visibility?: ContextVisibility;

  @ApiPropertyOptional({
    description: 'Default currency for the context',
    example: 'USD',
    maxLength: 3,
  })
  @IsString()
  @IsOptional()
  @MaxLength(3)
  defaultCurrency?: string;

  @ApiPropertyOptional({
    description: 'Timezone for the context',
    example: 'America/New_York',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Hex color for UI display',
    example: '#1976d2',
  })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({
    description: 'Icon identifier for UI',
    example: 'family_restroom',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Additional settings for the context',
    type: 'object',
  })
  @IsOptional()
  settings?: Record<string, any>;
}