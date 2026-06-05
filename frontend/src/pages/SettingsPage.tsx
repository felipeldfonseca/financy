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
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { authApi } from '../services/authApi';
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '../utils/currency.utils';

// Get language options with translations
const getLanguageOptions = (t: any) => [
  { code: 'en', name: t('languages.en') },
  { code: 'es', name: t('languages.es') },
  { code: 'pt', name: t('languages.pt') },
];

// Get timezone options with translations
const getTimezoneOptions = (t: any) => [
  { value: 'America/New_York', label: t('timezones.America/New_York') },
  { value: 'America/Chicago', label: t('timezones.America/Chicago') },
  { value: 'America/Denver', label: t('timezones.America/Denver') },
  { value: 'America/Los_Angeles', label: t('timezones.America/Los_Angeles') },
  { value: 'America/Sao_Paulo', label: t('timezones.America/Sao_Paulo') },
  { value: 'Europe/London', label: t('timezones.Europe/London') },
  { value: 'Europe/Paris', label: t('timezones.Europe/Paris') },
  { value: 'Asia/Tokyo', label: t('timezones.Asia/Tokyo') },
  { value: 'Australia/Sydney', label: t('timezones.Australia/Sydney') },
  { value: 'UTC', label: t('timezones.UTC') },
];

const SettingsPage: React.FC = () => {
  const { t } = useTranslation('settings');
  const navigate = useNavigate();
  const { state: authState, refreshAuth } = useAuth();
  const { changeLanguage } = useLanguage();

  // Profile state
  const [firstName, setFirstName] = useState(authState.user?.firstName || '');
  const [lastName, setLastName] = useState(authState.user?.lastName || '');
  const [language, setLanguage] = useState(authState.user?.language || 'en');

  // Handle language change with real-time UI update
  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    // Immediately change the UI language
    changeLanguage(newLanguage);
  };
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
      setErrorProfile(t('profile.errorRequired'));
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
      const errorMessage = err.response?.data?.message || t('profile.errorGeneric');
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
      const errorMessage = err.response?.data?.message || t('currency.errorGeneric');
      setErrorCurrency(errorMessage);
    } finally {
      setIsLoadingCurrency(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorPassword(t('password.errorRequired'));
      return;
    }

    if (newPassword.length < 8) {
      setErrorPassword(t('password.errorMinLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorPassword(t('password.errorMismatch'));
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
      const errorMessage = err.response?.data?.message || t('password.errorGeneric');
      setErrorPassword(errorMessage);
    } finally {
      setIsLoadingPassword(false);
    }
  };


  // Get translated options
  const languageOptions = getLanguageOptions(t);
  const timezoneOptions = getTimezoneOptions(t);

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('title')}
      </Typography>

      <Grid container spacing={3}>
        {/* User Profile */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('profile.title')}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {successProfile && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessProfile(false)}>
                {t('profile.successMessage')}
              </Alert>
            )}

            {errorProfile && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorProfile(null)}>
                {errorProfile}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label={t('profile.email')}
                value={authState.user?.email || ''}
                disabled
                fullWidth
                variant="outlined"
                helperText={t('profile.emailHelper')}
              />
              <TextField
                label={t('profile.firstName')}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                fullWidth
                variant="outlined"
                required
              />
              <TextField
                label={t('profile.lastName')}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                fullWidth
                variant="outlined"
                required
              />
              <TextField
                select
                label={t('profile.language')}
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                fullWidth
                variant="outlined"
              >
                {languageOptions.map((lang) => (
                  <MenuItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label={t('profile.timezone')}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                fullWidth
                variant="outlined"
              >
                {timezoneOptions.map((tz) => (
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
                    {t('profile.saving')}
                  </>
                ) : (
                  t('profile.saveButton')
                )}
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Currency Preferences */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('currency.title')}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {successCurrency && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessCurrency(false)}>
                {t('currency.successMessage', { currency: selectedCurrency })}
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
                label={t('currency.defaultCurrency')}
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                fullWidth
                variant="outlined"
                helperText={t('currency.helper')}
              >
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <MenuItem key={currency} value={currency}>
                    {currency} ({getCurrencySymbol(currency)})
                  </MenuItem>
                ))}
              </TextField>

              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('currency.current')}: {authState.user?.defaultCurrency || 'USD'} (
                  {getCurrencySymbol(authState.user?.defaultCurrency || 'USD')})
                </Typography>
                {hasCurrencyChanges && (
                  <Typography variant="body2" color="primary" gutterBottom>
                    {t('currency.new')}: {selectedCurrency} ({getCurrencySymbol(selectedCurrency)})
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
                    {t('currency.saving')}
                  </>
                ) : (
                  t('currency.saveButton')
                )}
              </Button>

              <Box sx={{ mt: 2, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  <strong>{t('currency.note.title')}</strong> {t('currency.note.description')}
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>
                      {t('currency.note.points.conversion', { currency: selectedCurrency })}
                    </li>
                    <li>
                      {t('currency.note.points.display', { currency: selectedCurrency })}
                    </li>
                    <li>{t('currency.note.points.rates')}</li>
                    <li>{t('currency.note.points.preservation')}</li>
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
              {t('password.title')}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {successPassword && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessPassword(false)}>
                {t('password.successMessage')}
              </Alert>
            )}

            {errorPassword && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorPassword(null)}>
                {errorPassword}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label={t('password.currentPassword')}
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
                label={t('password.newPassword')}
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                variant="outlined"
                helperText={t('password.helper')}
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
                label={t('password.confirmPassword')}
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
                    {t('password.changing')}
                  </>
                ) : (
                  t('password.changeButton')
                )}
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Telegram Integration */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('telegram.title')}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TelegramIcon sx={{ fontSize: 40, color: '#0088cc' }} />
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {t('telegram.description')}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Chip
                      label={isTelegramLinked ? t('telegram.connected') : t('telegram.notConnected')}
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
                {isTelegramLinked ? t('telegram.manageButton') : t('telegram.connectButton')}
              </Button>
            </Box>

            {!isTelegramLinked && (
              <Alert severity="info" sx={{ mt: 2 }}>
                {t('telegram.infoMessage')}
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SettingsPage;
