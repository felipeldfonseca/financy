// This file is deprecated - using AuthContext instead
// Keeping for backward compatibility during migration

import { User } from '../services/authApi';

export interface LegacyAuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// For compatibility with existing components that might import this
export const useAuthStore = () => {
  const token = localStorage.getItem('financy_token');
  const userStr = localStorage.getItem('financy_user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  return {
    user,
    token,
    isAuthenticated: !!token && !!user,
    login: () => {
      console.warn('useAuthStore.login is deprecated. Use AuthContext instead.');
    },
    logout: () => {
      console.warn('useAuthStore.logout is deprecated. Use AuthContext instead.');
    },
  };
};