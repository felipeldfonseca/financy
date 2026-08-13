import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Typography, Box, Grid } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { UpcomingBillsCard } from '../components/planning/UpcomingBillsCard';
import { SavingsGoalsCard } from '../components/planning/SavingsGoalsCard';
import { CalendarHeatmapCard } from '../components/planning/CalendarHeatmapCard';
import { BudgetStatusCard } from '../components/planning/BudgetStatusCard';
import { transactionApi, CalendarDay } from '../services/transactionApi';
import { billApi, Bill } from '../services/billApi';
import { projectBillsIntoMonth, ProjectedBill } from '../utils/recurrence';
import { useFinancialContexts } from '../contexts/ContextsContext';
import { useAuth } from '../contexts/AuthContext';
import { monthKey } from '../utils/calendar';

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
  const [openBills, setOpenBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currency =
    selectedContext?.defaultCurrency || authState.user?.defaultCurrency || 'BRL';

  const load = useCallback(async () => {
    setIsLoading(true);
    const month = monthKey(viewMonth);
    try {
      // One trip for the heatmap, one for the month's bills, one for every
      // open bill — the last feeds the recurrence projection, which needs
      // bills whose own due date lies in earlier months.
      const [days, bills, allOpen] = await Promise.all([
        transactionApi.getCalendar(month, selectedContextId),
        billApi.list({ month, status: 'all', contextId: selectedContextId }),
        billApi.list({ status: 'open', contextId: selectedContextId }),
      ]);
      setCalendarDays(days);
      setMonthBills(bills);
      setOpenBills(allOpen);
    } catch {
      setCalendarDays([]);
      setMonthBills([]);
      setOpenBills([]);
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

  // Recurring and installment bills seen again in future months, calendar-app
  // style: one real row, the rest projected — never stored.
  const projectedBills = useMemo(
    () => projectBillsIntoMonth(openBills, monthKey(viewMonth)),
    [openBills, viewMonth],
  );
  const calendarBills = useMemo<ProjectedBill[]>(
    () => [...monthBills, ...projectedBills],
    [monthBills, projectedBills],
  );

  // Committed money in the viewed month: real open bills due in it, plus the
  // projected occurrences that will exist by then — that is what planning a
  // future month means.
  const committed = useMemo(
    () =>
      calendarBills
        .filter((bill) => bill.status === 'open')
        .reduce((sum, bill) => sum + Number(bill.amount), 0),
    [calendarBills],
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
            monthBills={calendarBills}
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
          <SavingsGoalsCard />
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
