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
  Grid,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, Person } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { RegisterData } from '../../services/authApi';

interface RegisterFormData extends RegisterData {
  confirmPassword: string;
}

interface RegisterFormProps {
  onSuccess?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const { t } = useTranslation('auth');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { state, register: registerUser, clearError } = useAuth();
  const navigate = useNavigate();

  // Helper function to translate auth error messages
  const translateAuthError = (error: string): string => {
    if (error.includes('Invalid credentials')) {
      return t('errors.invalidCredentials');
    }
    if (error.includes('Registration failed')) {
      return t('errors.registrationFailed');
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
    return error || t('errors.registrationFailed');
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>();

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      clearError();
      const { confirmPassword, ...registerData } = data;
      await registerUser(registerData);
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/');
      }
    } catch (error) {
      // Error is handled by the auth context
    }
  };

  const passwordValidation = {
    required: t('register.password.required'),
    minLength: {
      value: 8,
      message: t('register.password.minLength'),
    },
    pattern: {
      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      message: t('register.password.strength'),
    },
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        {t('register.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
        {t('register.subtitle')}
      </Typography>

      {state.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {translateAuthError(state.error)}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            {...register('firstName', {
              required: t('register.firstName.required'),
              minLength: {
                value: 2,
                message: t('register.firstName.minLength'),
              },
              maxLength: {
                value: 50,
                message: 'First name must not exceed 50 characters',
              },
            })}
            fullWidth
            label={t('register.firstName.label')}
            autoComplete="given-name"
            autoFocus
            error={!!errors.firstName}
            helperText={errors.firstName?.message}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Person color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            {...register('lastName', {
              required: t('register.lastName.required'),
              minLength: {
                value: 2,
                message: t('register.lastName.minLength'),
              },
              maxLength: {
                value: 50,
                message: 'Last name must not exceed 50 characters',
              },
            })}
            fullWidth
            label={t('register.lastName.label')}
            autoComplete="family-name"
            error={!!errors.lastName}
            helperText={errors.lastName?.message}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Person color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
      </Grid>

      <TextField
        {...register('email', {
          required: t('register.email.required'),
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: t('register.email.invalid'),
          },
        })}
        fullWidth
        label={t('register.email.label')}
        type="email"
        autoComplete="email"
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
        {...register('password', passwordValidation)}
        fullWidth
        label={t('register.password.label')}
        type={showPassword ? 'text' : 'password'}
        autoComplete="new-password"
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
                aria-label="toggle password visibility"
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <TextField
        {...register('confirmPassword', {
          required: t('register.confirmPassword.required'),
          validate: (value) => value === password || t('register.confirmPassword.noMatch'),
        })}
        fullWidth
        label={t('register.confirmPassword.label')}
        type={showConfirmPassword ? 'text' : 'password'}
        autoComplete="new-password"
        margin="normal"
        error={!!errors.confirmPassword}
        helperText={errors.confirmPassword?.message}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                edge="end"
              >
                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
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
          t('register.submit')
        )}
      </Button>
    </Box>
  );
};