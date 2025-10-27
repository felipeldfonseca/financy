import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Telegram as TelegramIcon,
  ArrowForward as ArrowIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/authApi';
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '../utils/currency.utils';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { state: authState, refreshAuth } = useAuth();
  const [selectedCurrency, setSelectedCurrency] = useState(
    authState.user?.defaultCurrency || 'USD'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTelegramLinked = !!authState.user?.telegramUsername;

  const handleCurrencyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedCurrency(event.target.value);
    setSuccess(false);
    setError(null);
  };

  const handleSaveSettings = async () => {
    if (!authState.user) return;

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(false);

      // Update user profile with new currency
      await authApi.updateProfile({
        defaultCurrency: selectedCurrency,
      });

      // Refresh auth context to get updated user data
      await refreshAuth();

      setSuccess(true);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || 'Failed to update settings. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = selectedCurrency !== authState.user?.defaultCurrency;

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>

      <Grid container spacing={3}>
        {/* User Information */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              User Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Email"
                value={authState.user?.email || ''}
                disabled
                fullWidth
                variant="outlined"
              />
              <TextField
                label="First Name"
                value={authState.user?.firstName || ''}
                disabled
                fullWidth
                variant="outlined"
              />
              <TextField
                label="Last Name"
                value={authState.user?.lastName || ''}
                disabled
                fullWidth
                variant="outlined"
              />
              <TextField
                label="Language"
                value={authState.user?.language || 'en'}
                disabled
                fullWidth
                variant="outlined"
              />
              <TextField
                label="Timezone"
                value={authState.user?.timezone || 'UTC'}
                disabled
                fullWidth
                variant="outlined"
              />
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

            {success && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
                Currency preference updated successfully! All your transactions will now be
                displayed in {selectedCurrency}.
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                select
                label="Default Currency"
                value={selectedCurrency}
                onChange={handleCurrencyChange}
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
                {hasChanges && (
                  <Typography variant="body2" color="primary" gutterBottom>
                    New Currency: {selectedCurrency} ({getCurrencySymbol(selectedCurrency)})
                  </Typography>
                )}
              </Box>

              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveSettings}
                disabled={!hasChanges || isLoading}
                fullWidth
                sx={{ mt: 2 }}
              >
                {isLoading ? (
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

        {/* Telegram Integration */}
        <Grid item xs={12}>
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
                      color={isTelegramLinked ? 'success' : 'default'}
                      size="small"
                      icon={isTelegramLinked ? <CheckIcon /> : undefined}
                    />
                    {isTelegramLinked && (
                      <Typography variant="caption" color="text.secondary">
                        @{authState.user?.telegramUsername}
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
