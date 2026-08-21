import { Exclude, Expose, Transform } from 'class-transformer';

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
  onboardingCompleted: boolean;

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

  // toClassOnly matters: the transform reads telegramUserId off the source
  // entity while this DTO is built, but the response serializer runs
  // transforms again on the way out — by then telegramUserId is excluded,
  // so a second pass would overwrite the computed true with false.
  @Expose()
  @Transform(({ obj }) => !!obj.telegramUserId, { toClassOnly: true })
  isTelegramLinked: boolean;

  @Exclude()
  password: string;

  @Exclude()
  telegramUserId: string;
}