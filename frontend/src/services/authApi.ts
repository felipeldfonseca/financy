import api from './api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  language: string;
  timezone: string;
  defaultCurrency: string;
  isActive: boolean;
  lastLoginAt: string;
  emailVerifiedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export const authApi = {
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async getProfile(): Promise<{ user: User }> {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  async refreshToken(): Promise<AuthResponse> {
    const response = await api.post('/auth/refresh');
    return response.data;
  },

  async logout(): Promise<{ message: string }> {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  async changePassword(data: ChangePasswordData): Promise<{ message: string }> {
    const response = await api.post('/users/change-password', data);
    return response.data;
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await api.patch('/users/profile', data);
    return response.data;
  },

  async linkTelegram(data: { telegramUserId: string; telegramUsername?: string }): Promise<User> {
    const response = await api.post('/users/link-telegram', data);
    return response.data;
  },
};