import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  SvgIcon,
} from '@mui/material';
import { TrackChanges as GoalIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { UpcomingBillsCard } from '../components/planning/UpcomingBillsCard';
import { CalendarHeatmapCard } from '../components/planning/CalendarHeatmapCard';
import { BudgetStatusCard } from '../components/planning/BudgetStatusCard';
import { transactionApi, CalendarDay } from '../services/transactionApi';
import { billApi, Bill } from '../services/billApi';
import { useFinancialContexts } from '../contexts/ContextsContext';
import { useAuth } from '../contexts/AuthContext';
import { monthKey } from '../utils/calendar';

// SVG Icons for empty states
const ComingSoonIcon: React.FC<{ sx?: any }> = ({ sx }) => (
  <SvgIcon sx={sx} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
    <path
      d="M12 6v6l4 2"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </SvgIcon>
);

const PlanningPage: React.FC = () => {
  const { t } = useTranslation('planning');
  const { selectedContextId, selectedContext } = useFinancialContexts();
  const { state: authState } = useAuth();

  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [monthBills, setMonthBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currency =
    selectedContext?.defaultCurrency || authState.user?.defaultCurrency || 'BRL';

  const load = useCallback(async () => {
    setIsLoading(true);
    const month = monthKey(viewMonth);
    try {
      // One trip for the heatmap, one for the month's bills; the budget card
      // reads both, so nothing is fetched twice.
      const [days, bills] = await Promise.all([
        transactionApi.getCalendar(month, selectedContextId),
        billApi.list({ month, status: 'all', contextId: selectedContextId }),
      ]);
      setCalendarDays(days);
      setMonthBills(bills);
    } catch {
      setCalendarDays([]);
      setMonthBills([]);
    } finally {
      setIsLoading(false);
    }
  }, [viewMonth, selectedContextId]);

  useEffect(() => {
    load();
  }, [load]);

  const spent = useMemo(
    () => calendarDays.reduce((sum, day) => sum + Number(day.expense), 0),
    [calendarDays],
  );
  const committed = useMemo(
    () =>
      monthBills
        .filter((bill) => bill.status === 'open')
        .reduce((sum, bill) => sum + Number(bill.amount), 0),
    [monthBills],
  );

  return (
    <Box sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="brand"
          component="h1"
          gutterBottom
          sx={{
            color: 'text.primary',
            fontSize: '2.5rem',
          }}
        >
          {t('title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('description')}
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Calendar heatmap */}
        <Grid item xs={12}>
          <CalendarHeatmapCard
            viewMonth={viewMonth}
            onMonthChange={setViewMonth}
            days={calendarDays}
            monthBills={monthBills}
            isLoading={isLoading}
            contextId={selectedContextId}
            currency={currency}
          />
        </Grid>

        {/* Upcoming Bills Section */}
        <Grid item xs={12} md={6}>
          <UpcomingBillsCard />
        </Grid>

        {/* Budget status */}
        <Grid item xs={12} md={6}>
          <BudgetStatusCard
            viewMonth={viewMonth}
            spent={spent}
            committed={committed}
            currency={currency}
          />
        </Grid>

        {/* Savings Goals Section */}
        <Grid item xs={12} md={6}>
          <Card sx={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            height: '100%',
            minHeight: 300,
          }}>
            <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <GoalIcon sx={{ fontSize: 32, color: '#10b981' }} />
                <Typography variant="h5" fontWeight={600}>
                  {t('savingsGoals.title')}
                </Typography>
              </Box>

              <Box sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}>
                <ComingSoonIcon sx={{ fontSize: 64, color: '#10b981', mb: 3, opacity: 0.6 }} />

                <Typography variant="h6" gutterBottom fontWeight={600}>
                  {t('comingSoon')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 300 }}>
                  {t('savingsGoals.description')}
                </Typography>

                <Box sx={{
                  p: 2,
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px dashed rgba(16, 185, 129, 0.2)',
                  width: '100%',
                }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('savingsGoals.features')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Info Banner */}
      <Box sx={{
        mt: 4,
        p: 4,
        borderRadius: '20px',
        background: 'linear-gradient(135deg, rgba(70, 87, 216, 0.1) 0%, rgba(59, 71, 196, 0.05) 100%)',
        border: '1px solid rgba(70, 87, 216, 0.2)',
        textAlign: 'center',
      }}>
        <Typography variant="h6" gutterBottom fontWeight={600}>
          {t('helpBanner.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('helpBanner.description')}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          {t('helpBanner.note')}
        </Typography>
      </Box>
    </Box>
  );
};

export default PlanningPage;
