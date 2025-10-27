import React from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Typography,
  Grid,
} from '@mui/material';
import { OnboardingPreferences } from '../OnboardingWizard';

interface PreferencesStepProps {
  preferences: OnboardingPreferences;
  onPreferencesChange: (preferences: OnboardingPreferences) => void;
}

const CURRENCIES = [
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'BRL', label: 'Brazilian Real (R$)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'CAD', label: 'Canadian Dollar (C$)' },
  { value: 'AUD', label: 'Australian Dollar (A$)' },
  { value: 'BTC', label: 'Bitcoin (₿)' },
  { value: 'ETH', label: 'Ethereum (Ξ)' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
  { value: 'es', label: 'Español' },
];

// Common timezones
const TIMEZONES = [
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

const PreferencesStep: React.FC<PreferencesStepProps> = ({
  preferences,
  onPreferencesChange,
}) => {
  const handleChange = (field: keyof OnboardingPreferences) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onPreferencesChange({
      ...preferences,
      [field]: event.target.value,
    });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Set Your Preferences
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Customize your Financy experience. You can change these later in settings.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            select
            fullWidth
            label="Default Currency"
            value={preferences.defaultCurrency}
            onChange={handleChange('defaultCurrency')}
            helperText="Your primary currency for transactions"
          >
            {CURRENCIES.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12}>
          <TextField
            select
            fullWidth
            label="Timezone"
            value={preferences.timezone}
            onChange={handleChange('timezone')}
            helperText="Used for date and time display"
          >
            {TIMEZONES.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid item xs={12}>
          <TextField
            select
            fullWidth
            label="Language"
            value={preferences.language}
            onChange={handleChange('language')}
            helperText="Interface language (coming soon)"
          >
            {LANGUAGES.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PreferencesStep;
