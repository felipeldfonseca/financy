import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Dashboard as DashboardIcon,
  Group as GroupIcon,
  Repeat as RepeatIcon,
  AccountBalance as BudgetIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const TutorialStep: React.FC = () => {
  const { t } = useTranslation('onboarding');
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('tutorial.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('tutorial.subtitle')}
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ChatIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  {t('tutorial.features.trackingTitle')}
                </Typography>
              </Box>
              <List dense>
                <ListItem disablePadding>
                  <ListItemText
                    primary={t('tutorial.features.telegramTracking')}
                    secondary={t('tutorial.features.telegramTrackingDesc')}
                  />
                </ListItem>
                <ListItem disablePadding>
                  <ListItemText
                    primary={t('tutorial.features.webTracking')}
                    secondary={t('tutorial.features.webTrackingDesc')}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DashboardIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  {t('tutorial.features.insightsTitle')}
                </Typography>
              </Box>
              <List dense>
                <ListItem disablePadding>
                  <ListItemText
                    primary={t('tutorial.features.trendInsights')}
                    secondary={t('tutorial.features.trendInsightsDesc')}
                  />
                </ListItem>
                <ListItem disablePadding>
                  <ListItemText
                    primary={t('tutorial.features.categoryBreakdown')}
                    secondary={t('tutorial.features.categoryBreakdownDesc')}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BudgetIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  {t('tutorial.features.budgetTitle')}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {t('tutorial.features.budgetDesc')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <RepeatIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  {t('tutorial.features.recurringTitle')}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {t('tutorial.features.recurringDesc')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', color: 'primary.contrastText' }}>
          <GroupIcon sx={{ mr: 1 }} />
          <strong>{t('tutorial.comingSoon')}</strong>
        </Typography>
      </Box>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Chip label={t('tutorial.chips.voiceInput')} size="small" />
        <Chip label={t('tutorial.chips.receiptScanning')} size="small" />
        <Chip label={t('tutorial.chips.multiCurrency')} size="small" />
        <Chip label={t('tutorial.chips.autoCategories')} size="small" />
      </Box>
    </Box>
  );
};

export default TutorialStep;
