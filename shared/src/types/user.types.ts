export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  telegramUserId?: string;
  telegramUsername?: string;
  isActive: boolean;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  telegramUserId?: string;
  telegramUsername?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  telegramUsername?: string;
  isActive?: boolean;
  onboardingCompleted?: boolean;
  language?: string;
  timezone?: string;
  defaultCurrency?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  telegramUsername?: string;
  isActive: boolean;
  onboardingCompleted: boolean;
  language: string;
  timezone: string;
  defaultCurrency: string;
  createdAt: Date;
  updatedAt: Date;
}