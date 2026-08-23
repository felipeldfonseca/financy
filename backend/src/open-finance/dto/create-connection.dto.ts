import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateConnectionDto {
  // Pluggy item id returned by the Connect widget's onSuccess callback.
  @IsString()
  @MaxLength(64)
  itemId: string;

  // Context where synced transactions are filed; defaults to the user's
  // personal context.
  @IsOptional()
  @IsUUID()
  contextId?: string;
}
