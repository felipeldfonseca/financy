import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { LoginData } from '../../services/authApi';

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { t } = useTranslation('auth');
  const [showPassword, setShowPassword] = useState(false);
  const { state, login, clearError } = useAuth();
  const navigate = useNavigate();

  // Helper function to translate auth error messages
  const translateAuthError = (error: string): string => {
    if (error.includes('Invalid credentials')) {
      return t('errors.invalidCredentials');
    }
    if (error.includes('Login failed')) {
      return t('errors.loginFailed');
    }
    if (error.includes('User not found')) {
      return t('errors.userNotFound');
    }
    if (error.includes('Invalid token')) {
      return t('errors.invalidToken');
    }
    if (error.includes('Network Error')) {
      return t('errors.networkError');
    }
    // For any unknown errors, return the original message or a generic fallback
    return error || t('errors.loginFailed');
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginData>();

  const onSubmit = async (data: LoginData) => {
    try {
      clearError();
      await login(data);
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/');
      }
    } catch (error) {
      // Error is handled by the auth context
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        {t('login.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
        {t('login.subtitle')}
      </Typography>

      {state.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {translateAuthError(state.error)}
        </Alert>
      )}

      <TextField
        {...register('email', {
          required: t('login.email.required'),
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: t('login.email.invalid'),
          },
        })}
        fullWidth
        label={t('login.email.label')}
        type="email"
        autoComplete="email"
        autoFocus
        margin="normal"
        error={!!errors.email}
        helperText={errors.email?.message}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Email color="action" />
            </InputAdornment>
          ),
        }}
      />

      <TextField
        {...register('password', {
          required: t('login.password.required'),
        })}
        fullWidth
        label={t('login.password.label')}
        type={showPassword ? 'text' : 'password'}
        autoComplete="current-password"
        margin="normal"
        error={!!errors.password}
        helperText={errors.password?.message}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={t('login.password.toggleVisibility')}
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={isSubmitting || state.isLoading}
        sx={{ mt: 3, mb: 2, py: 1.5 }}
      >
        {isSubmitting || state.isLoading ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          t('login.submit')
        )}
      </Button>
    </Box>
  );
};