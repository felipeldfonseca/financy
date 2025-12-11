import React from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Typography,
  Grid,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { OnboardingPreferences } from '../OnboardingWizard';

interface PreferencesStepProps {
  preferences: OnboardingPreferences;
  onPreferencesChange: (preferences: OnboardingPreferences) => void;
}

const getCurrencyOptions = (t: any) => [
  { value: 'USD', label: t('currencies.USD') },
  { value: 'BRL', label: t('currencies.BRL') },
  { value: 'EUR', label: t('currencies.EUR') },
  { value: 'GBP', label: t('currencies.GBP') },
  { value: 'CAD', label: t('currencies.CAD') },
  { value: 'AUD', label: t('currencies.AUD') },
  { value: 'BTC', label: t('currencies.BTC') },
  { value: 'ETH', label: t('currencies.ETH') },
];

const getLanguageOptions = (t: any) => [
  { value: 'en', label: t('languages.en') },
  { value: 'pt', label: t('languages.pt') },
  { value: 'es', label: t('languages.es') },
];

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

const PreferencesStep: React.FC<PreferencesStepProps> = ({
  preferences,
  onPreferencesChange,
}) => {
  const { t } = useTranslation('onboarding');
  
  const handleChange = (field: keyof OnboardingPreferences) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onPreferencesChange({
      ...preferences,
      [field]: event.target.value,
    });
  };

  const currencyOptions = getCurrencyOptions(t);
  const languageOptions = getLanguageOptions(t);
  const timezoneOptions = getTimezoneOptions(t);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('preferences.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('preferences.subtitle')}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            select
            fullWidth
            label={t('preferences.defaultCurrency')}
            value={preferences.defaultCurrency}
            onChange={handleChange('defaultCurrency')}
            helperText={t('preferences.defaultCurrencyHelper')}
          >
            {currencyOptions.map((option) => (
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
            label={t('preferences.timezone')}
            value={preferences.timezone}
            onChange={handleChange('timezone')}
            helperText={t('preferences.timezoneHelper')}
          >
            {timezoneOptions.map((option) => (
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
            label={t('preferences.language')}
            value={preferences.language}
            onChange={handleChange('language')}
            helperText={t('preferences.languageHelper')}
          >
            {languageOptions.map((option) => (
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
