import React, { useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  Box,
  Grid,
  TextField,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Telegram as TelegramIcon,
  ArrowForward as ArrowIcon,
  CheckCircle as CheckIcon,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/authApi';
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '../utils/currency.utils';

// Language options
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
];

// Common timezones
const SUPPORTED_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Sao_Paulo', label: 'Brasília Time (BRT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
];

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { state: authState, refreshAuth } = useAuth();

  // Profile state
  const [firstName, setFirstName] = useState(authState.user?.firstName || '');
  const [lastName, setLastName] = useState(authState.user?.lastName || '');
  const [language, setLanguage] = useState(authState.user?.language || 'en');
  const [timezone, setTimezone] = useState(authState.user?.timezone || 'UTC');
  const [selectedCurrency, setSelectedCurrency] = useState(authState.user?.defaultCurrency || 'USD');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingCurrency, setIsLoadingCurrency] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [successProfile, setSuccessProfile] = useState(false);
  const [successCurrency, setSuccessCurrency] = useState(false);
  const [successPassword, setSuccessPassword] = useState(false);
  const [errorProfile, setErrorProfile] = useState<string | null>(null);
  const [errorCurrency, setErrorCurrency] = useState<string | null>(null);
  const [errorPassword, setErrorPassword] = useState<string | null>(null);

  const isTelegramLinked = !!authState.user?.isTelegramLinked;

  // Update local state when auth state changes
  useEffect(() => {
    if (authState.user) {
      setFirstName(authState.user.firstName || '');
      setLastName(authState.user.lastName || '');
      setLanguage(authState.user.language || 'en');
      setTimezone(authState.user.timezone || 'UTC');
      setSelectedCurrency(authState.user.defaultCurrency || 'USD');
    }
  }, [authState.user]);

  const hasProfileChanges =
    firstName !== authState.user?.firstName ||
    lastName !== authState.user?.lastName ||
    language !== authState.user?.language ||
    timezone !== authState.user?.timezone;

  const hasCurrencyChanges = selectedCurrency !== authState.user?.defaultCurrency;

  const handleSaveProfile = async () => {
    if (!authState.user) return;

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      setErrorProfile('First name and last name are required.');
      return;
    }

    try {
      setIsLoadingProfile(true);
      setErrorProfile(null);
      setSuccessProfile(false);

      await authApi.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        language,
        timezone,
      });

      await refreshAuth();
      setSuccessProfile(true);
      setTimeout(() => setSuccessProfile(false), 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update profile. Please try again.';
      setErrorProfile(errorMessage);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleSaveCurrency = async () => {
    if (!authState.user) return;

    try {
      setIsLoadingCurrency(true);
      setErrorCurrency(null);
      setSuccessCurrency(false);

      await authApi.updateProfile({
        defaultCurrency: selectedCurrency,
      });

      await refreshAuth();
      setSuccessCurrency(true);
      setTimeout(() => setSuccessCurrency(false), 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update currency. Please try again.';
      setErrorCurrency(errorMessage);
    } finally {
      setIsLoadingCurrency(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorPassword('All password fields are required.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorPassword('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorPassword('New passwords do not match.');
      return;
    }

    try {
      setIsLoadingPassword(true);
      setErrorPassword(null);
      setSuccessPassword(false);

      await authApi.changePassword({
        currentPassword,
        newPassword,
      });

      setSuccessPassword(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessPassword(false), 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to change password. Please try again.';
      setErrorPassword(errorMessage);
    } finally {
      setIsLoadingPassword(false);
    }
  };


  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>

      <Grid container spacing={3}>
        {/* User Profile */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Profile Information
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {successProfile && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessProfile(false)}>
                Profile updated successfully!
              </Alert>
            )}

            {errorProfile && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorProfile(null)}>
                {errorProfile}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Email"
                value={authState.user?.email || ''}
                disabled
                fullWidth
                variant="outlined"
                helperText="Email cannot be changed"
              />
              <TextField
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                fullWidth
                variant="outlined"
                required
              />
              <TextField
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                fullWidth
                variant="outlined"
                required
              />
              <TextField
                select
                label="Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                fullWidth
                variant="outlined"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <MenuItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                fullWidth
                variant="outlined"
              >
                {SUPPORTED_TIMEZONES.map((tz) => (
                  <MenuItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </MenuItem>
                ))}
              </TextField>

              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveProfile}
                disabled={!hasProfileChanges || isLoadingProfile}
                fullWidth
                sx={{ mt: 2 }}
              >
                {isLoadingProfile ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                    Saving...
                  </>
                ) : (
                  'Save Profile'
                )}
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Currency Preferences */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Currency Preferences
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {successCurrency && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessCurrency(false)}>
                Currency preference updated successfully! All your transactions will now be
                displayed in {selectedCurrency}.
              </Alert>
            )}

            {errorCurrency && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorCurrency(null)}>
                {errorCurrency}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                select
                label="Default Currency"
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                fullWidth
                variant="outlined"
                helperText="All transactions will be converted to this currency for display and analytics"
              >
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <MenuItem key={currency} value={currency}>
                    {currency} ({getCurrencySymbol(currency)})
                  </MenuItem>
                ))}
              </TextField>

              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Current Currency: {authState.user?.defaultCurrency || 'USD'} (
                  {getCurrencySymbol(authState.user?.defaultCurrency || 'USD')})
                </Typography>
                {hasCurrencyChanges && (
                  <Typography variant="body2" color="primary" gutterBottom>
                    New Currency: {selectedCurrency} ({getCurrencySymbol(selectedCurrency)})
                  </Typography>
                )}
              </Box>

              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveCurrency}
                disabled={!hasCurrencyChanges || isLoadingCurrency}
                fullWidth
                sx={{ mt: 2 }}
              >
                {isLoadingCurrency ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                    Saving...
                  </>
                ) : (
                  'Save Currency Preference'
                )}
              </Button>

              <Box sx={{ mt: 2, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  <strong>Note:</strong> When you change your default currency:
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>
                      New transactions entered in different currencies will be automatically
                      converted to {selectedCurrency}
                    </li>
                    <li>
                      Your dashboard and analytics will display all amounts in {selectedCurrency}
                    </li>
                    <li>Exchange rates are updated hourly for accuracy</li>
                    <li>Original transaction amounts and currencies are preserved</li>
                  </ul>
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Change Password */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Change Password
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {successPassword && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessPassword(false)}>
                Password changed successfully!
              </Alert>
            )}

            {errorPassword && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorPassword(null)}>
                {errorPassword}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Current Password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                fullWidth
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        edge="end"
                      >
                        {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="New Password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                variant="outlined"
                helperText="Minimum 8 characters"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end"
                      >
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                fullWidth
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
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
                variant="contained"
                color="primary"
                onClick={handleChangePassword}
                disabled={isLoadingPassword}
                fullWidth
                sx={{ mt: 2 }}
              >
                {isLoadingPassword ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                    Changing Password...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Telegram Integration */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Telegram Integration
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TelegramIcon sx={{ fontSize: 40, color: '#0088cc' }} />
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Track finances via Telegram
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Chip
                      label={isTelegramLinked ? 'Connected' : 'Not Connected'}
                      size="small"
                      sx={isTelegramLinked
                        ? { bgcolor: 'success.main', color: 'white' }
                        : { bgcolor: 'grey.300', color: 'text.secondary' }
                      }
                    />
                    {isTelegramLinked && authState.user?.telegramUsername && (
                      <Typography variant="caption" color="text.secondary">
                        @{authState.user.telegramUsername}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
              <Button
                variant="contained"
                endIcon={<ArrowIcon />}
                onClick={() => navigate('/settings/telegram')}
                sx={{
                  bgcolor: '#0088cc',
                  '&:hover': { bgcolor: '#006699' },
                }}
              >
                {isTelegramLinked ? 'Manage Connection' : 'Connect Telegram'}
              </Button>
            </Box>

            {!isTelegramLinked && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Link your Telegram account to track transactions with text messages, voice notes, or photos on the go!
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SettingsPage;
