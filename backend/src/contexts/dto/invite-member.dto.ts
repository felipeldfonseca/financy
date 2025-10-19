import { IsString, IsOptional, IsEnum, IsEmail, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberRole } from '../entities/context-member.entity';

export class InviteMemberDto {
  @ApiProperty({
    description: 'Email address of the user to invite',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Role to assign to the new member',
    enum: MemberRole,
    example: MemberRole.MEMBER,
  })
  @IsEnum(MemberRole)
  role: MemberRole;

  @ApiPropertyOptional({
    description: 'Personal message to include in the invitation',
    example: 'Join our family budget tracking!',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  message?: string;
}

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: 'New role for the member',
    enum: MemberRole,
    example: MemberRole.ADMIN,
  })
  @IsEnum(MemberRole)
  role: MemberRole;
}