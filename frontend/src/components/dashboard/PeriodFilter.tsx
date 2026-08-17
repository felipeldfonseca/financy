import React from 'react';
import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { DashboardPeriod } from '../../utils/dashboardPeriod';

interface Props {
  value: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
}

/**
 * One row above the charts: which window the whole dashboard reads —
 * summary, categories and charts alike. Monthly (6m) is the default; the
 * page falls back to "this month" on its own when history is too short.
 */
export const PeriodFilter: React.FC<Props> = ({ value, onChange }) => {
  const { t } = useTranslation('dashboard');

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(_event, period: DashboardPeriod | null) => {
          if (period) onChange(period);
        }}
        sx={{
          background: 'rgba(255,255,255,0.6)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: '14px',
          p: 0.5,
          gap: 0.5,
          '& .MuiToggleButton-root': {
            border: 0,
            borderRadius: '10px !important',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.82rem',
            px: 2,
            py: 0.75,
            color: 'text.secondary',
            '&.Mui-selected': {
              background: 'linear-gradient(135deg, #4657D8 0%, #3b47c4 100%)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(135deg, #3b47c4 0%, #3238b0 100%)',
              },
            },
          },
        }}
      >
        <ToggleButton value="this-month">{t('periodFilter.thisMonth')}</ToggleButton>
        <ToggleButton value="6m">{t('periodFilter.sixMonths')}</ToggleButton>
        <ToggleButton value="12m">{t('periodFilter.twelveMonths')}</ToggleButton>
      </ToggleButtonGroup>
      <Typography variant="caption" color="text.secondary">
        {t('periodFilter.hint')}
      </Typography>
    </Box>
  );
};
