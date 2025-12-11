import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Stepper,
  Step,
  StepLabel,
  Box,
  Button,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import PreferencesStep from './steps/PreferencesStep';
import TelegramStep from './steps/TelegramStep';
import TutorialStep from './steps/TutorialStep';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { authApi } from '../../services/authApi';

interface OnboardingWizardProps {
  open: boolean;
  onComplete: () => void;
}

export interface OnboardingPreferences {
  language: string;
  timezone: string;
  defaultCurrency: string;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ open, onComplete }) => {
  const { t } = useTranslation('onboarding');
  const [activeStep, setActiveStep] = useState(0);
  const { state: { user }, refreshAuth } = useAuth();
  const { changeLanguage } = useLanguage();
  const [preferences, setPreferences] = useState<OnboardingPreferences>({
    language: user?.language || 'en',
    timezone: user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    defaultCurrency: user?.defaultCurrency || 'USD',
  });

  const steps = [
    t('steps.setPreferences'),
    t('steps.connectTelegram'),
    t('steps.quickTutorial')
  ];

  const handlePreferencesChange = (newPreferences: OnboardingPreferences) => {
    // If language changed, immediately update the UI language
    if (newPreferences.language !== preferences.language) {
      changeLanguage(newPreferences.language);
    }
    setPreferences(newPreferences);
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      // Save preferences
      try {
        await authApi.updateProfile({
          language: preferences.language,
          timezone: preferences.timezone,
          defaultCurrency: preferences.defaultCurrency,
        });
        await refreshAuth();
      } catch (error) {
        console.error('Failed to save preferences:', error);
      }
    }

    if (activeStep === steps.length - 1) {
      // Complete onboarding
      try {
        await authApi.updateProfile({ onboardingCompleted: true });
        await refreshAuth();
        onComplete();
      } catch (error) {
        console.error('Failed to complete onboarding:', error);
      }
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSkip = async () => {
    try {
      await authApi.updateProfile({ onboardingCompleted: true });
      await refreshAuth();
      onComplete();
    } catch (error) {
      console.error('Failed to skip onboarding:', error);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <PreferencesStep
            preferences={preferences}
            onPreferencesChange={handlePreferencesChange}
          />
        );
      case 1:
        return <TelegramStep />;
      case 2:
        return <TutorialStep />;
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown
    >
      <DialogTitle>
        <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
          {t('wizard.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('wizard.subtitle')}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ width: '100%', mt: 2 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box sx={{ minHeight: 300, mb: 3 }}>
            {renderStepContent(activeStep)}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2 }}>
            <Button
              color="inherit"
              disabled={activeStep === 0}
              onClick={handleBack}
            >
              {t('common:buttons.back')}
            </Button>
            <Box>
              <Button onClick={handleSkip} sx={{ mr: 1 }}>
                {t('wizard.skipForNow')}
              </Button>
              <Button
                variant="contained"
                onClick={handleNext}
              >
                {activeStep === steps.length - 1 ? t('wizard.getStarted') : t('common:buttons.next')}
              </Button>
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingWizard;
