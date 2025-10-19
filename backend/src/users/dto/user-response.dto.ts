import { Exclude, Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  telegramUsername: string;

  @Expose()
  language: string;

  @Expose()
  timezone: string;

  @Expose()
  defaultCurrency: string;

  @Expose()
  isActive: boolean;

  @Expose()
  lastLoginAt: Date;

  @Expose()
  emailVerifiedAt: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  @Exclude()
  password: string;

  @Exclude()
  telegramUserId: string;
}