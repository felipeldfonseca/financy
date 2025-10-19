import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { authApi, User, LoginData, RegisterData } from '../services/authApi';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: User };

interface AuthContextType {
  state: AuthState;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
};

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('financy_token');
      const userStr = localStorage.getItem('financy_user');
      
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } });
          
          // Verify token is still valid
          await authApi.getProfile();
        } catch (error) {
          // Token is invalid, clear storage
          localStorage.removeItem('financy_token');
          localStorage.removeItem('financy_user');
          dispatch({ type: 'AUTH_LOGOUT' });
        }
      }
    };

    checkAuth();
  }, []);

  const login = async (data: LoginData) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await authApi.login(data);
      
      // Store token and user in localStorage
      localStorage.setItem('financy_token', response.access_token);
      localStorage.setItem('financy_user', JSON.stringify(response.user));
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: response.user,
          token: response.access_token,
        },
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await authApi.register(data);
      
      // Store token and user in localStorage
      localStorage.setItem('financy_token', response.access_token);
      localStorage.setItem('financy_user', JSON.stringify(response.user));
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: response.user,
          token: response.access_token,
        },
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint if authenticated
      if (state.isAuthenticated) {
        await authApi.logout();
      }
    } catch (error) {
      // Ignore logout errors - still proceed with local logout
      console.warn('Logout request failed:', error);
    } finally {
      // Always clear local storage and state
      localStorage.removeItem('financy_token');
      localStorage.removeItem('financy_user');
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const refreshAuth = async () => {
    try {
      const response = await authApi.getProfile();
      dispatch({ type: 'UPDATE_USER', payload: response.user });
      localStorage.setItem('financy_user', JSON.stringify(response.user));
    } catch (error) {
      // If refresh fails, logout user
      await logout();
    }
  };

  const value: AuthContextType = {
    state,
    login,
    register,
    logout,
    clearError,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};