import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  EventNote as CalendarIcon,
  TrackChanges as GoalIcon,
  Savings as BudgetIcon,
  Add as AddIcon,
  TaskAlt as AllClearIcon,
  WarningAmberRounded as OverdueIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { billApi, Bill } from '../../services/billApi';
import { goalApi, Goal } from '../../services/goalApi';
import { transactionApi } from '../../services/transactionApi';
import { useFinancialContexts } from '../../contexts/ContextsContext';
import { useAuth } from '../../contexts/AuthContext';
import { computeBudget } from '../../utils/budget';
import { goalProgress } from '../../utils/goals';
import { isBillOverdue, parseLocalDate, sumByCurrency } from '../../utils/bills';
import { projectBillsIntoMonth } from '../../utils/recurrence';
import { monthKey, EXPENSE_POLE } from '../../utils/calendar';

const BILLS_ACCENT = '#f59e0b';
const OVERDUE_INK = '#b45309';
const BUDGET_ACCENT = '#6366f1';
const HATCH = `repeating-linear-gradient(45deg, ${EXPENSE_POLE}99 0 4px, transparent 4px 8px)`;

interface QuickActionsProps {
  contextType?: 'personal' | 'groups';
  selectedGroupName?: string;
  /** Shared context in scope; undefined = the personal view. */
  contextId?: string;
}

/**
 * The home screen's forward look: the next bills to pay and this month's
 * budget, live — the numbers someone opens the app to check — with Planning
 * one tap away. Goals stay a teaser until the feature ships.
 */
const QuickActions: React.FC<QuickActionsProps> = ({ contextId }) => {
  const { t, i18n } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { contexts } = useFinancialContexts();
  const { state: authState } = useAuth();

  const [openBills, setOpenBills] = useState<Bill[]>([]);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [monthSpent, setMonthSpent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [bills, days, goals] = await Promise.all([
        billApi.list({ status: 'open', contextId }),
        transactionApi.getCalendar(monthKey(new Date()), contextId),
        goalApi.list({ status: 'active', contextId }),
      ]);
      setOpenBills(bills);
      setMonthSpent(days.reduce((sum, day) => sum + Number(day.expense), 0));
      setActiveGoals(goals);
    } catch {
      setOpenBills([]);
      setMonthSpent(0);
      setActiveGoals([]);
    } finally {
      setIsLoading(false);
    }
  }, [contextId]);

  useEffect(() => {
    load();
  }, [load]);

  // The budget limit lives on the context in scope — the selected group's, or
  // the user's own personal context.
  const budgetContext = contextId
    ? contexts.find((context) => context.id === contextId)
    : contexts.find(
        (context) => context.type === 'personal' && context.ownerId === authState.user?.id,
      );
  const limit = Number(budgetContext?.settings?.monthlyBudget) || 0;

  const currency =
    budgetContext?.defaultCurrency || authState.user?.defaultCurrency || 'BRL';

  const formatCurrency = useCallback(
    (amount: number, currencyCode = currency) =>
      new Intl.NumberFormat(i18n.language, { style: 'currency', currency: currencyCode }).format(
        amount,
      ),
    [i18n.language, currency],
  );

  const formatDueDate = (isoDate: string) =>
    parseLocalDate(isoDate).toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit' });

  const nextBills = useMemo(
    () => [...openBills].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 3),
    [openBills],
  );
  const pendingTotals = useMemo(() => sumByCurrency(openBills), [openBills]);

  // Committed this month: open bills due in it plus projected recurrences —
  // the same arithmetic the Planning page shows.
  const committed = useMemo(() => {
    const month = monthKey(new Date());
    const dueThisMonth = openBills.filter((bill) => bill.dueDate.slice(0, 7) === month);
    const projected = projectBillsIntoMonth(openBills, month);
    return [...dueThisMonth, ...projected].reduce((sum, bill) => sum + Number(bill.amount), 0);
  }, [openBills]);

  const budget = computeBudget({ spent: monthSpent, committed, limit });

  const sectionFrame = (accent: string) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    p: 2,
    borderRadius: '12px',
    background: `${accent}08`,
    border: `1px dashed ${accent}33`,
    minHeight: 0,
  });

  return (
    <Grid container spacing={4}>
      <Grid item xs={12}>
        <Card sx={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
        }}>
          <CardContent sx={{ pt: 3, px: 3, pb: 3 }}>
            <Grid container spacing={3}>
              {/* Upcoming Bills — live */}
              <Grid item xs={12} md={4}>
                <Box sx={{ height: 240, display: 'flex', flexDirection: 'column' }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <CalendarIcon sx={{ fontSize: 24, color: BILLS_ACCENT }} />
                    <Typography variant="h6" fontWeight={600}>{t('quickActions.upcomingBills.title')}</Typography>
                  </Box>

                  <Box sx={sectionFrame(BILLS_ACCENT)}>
                    {isLoading ? (
                      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CircularProgress size={22} />
                      </Box>
                    ) : nextBills.length === 0 ? (
                      <Box
                        sx={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                          textAlign: 'center',
                        }}
                      >
                        <AllClearIcon sx={{ fontSize: 32, color: BILLS_ACCENT, opacity: 0.5 }} />
                        <Typography variant="body2" color="text.secondary">
                          {t('quickActions.upcomingBills.empty')}
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={() => navigate('/planning')}
                          sx={{ borderColor: BILLS_ACCENT, color: BILLS_ACCENT, textTransform: 'none' }}
                        >
                          {t('quickActions.upcomingBills.button')}
                        </Button>
                      </Box>
                    ) : (
                      <>
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0 }}>
                          {nextBills.map((bill) => {
                            const overdue = isBillOverdue(bill);
                            return (
                              <Box key={bill.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                {overdue && (
                                  <OverdueIcon sx={{ fontSize: 14, color: OVERDUE_INK }} />
                                )}
                                <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                                  {bill.description}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: overdue ? OVERDUE_INK : 'text.secondary', fontWeight: overdue ? 700 : 400 }}
                                >
                                  {overdue
                                    ? t('quickActions.upcomingBills.overdue', { date: formatDueDate(bill.dueDate) })
                                    : formatDueDate(bill.dueDate)}
                                </Typography>
                                <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
                                  {formatCurrency(Number(bill.amount), bill.currency)}
                                </Typography>
                              </Box>
                            );
                          })}
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, pt: 1, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                          <Typography variant="caption" color="text.secondary">
                            {t('quickActions.upcomingBills.totalPending')}{' '}
                            <b>
                              {pendingTotals
                                .map(({ currency: c, total }) => formatCurrency(total, c))
                                .join(' · ')}
                            </b>
                          </Typography>
                          <Button
                            size="small"
                            onClick={() => navigate('/planning')}
                            sx={{ color: BILLS_ACCENT, textTransform: 'none', minWidth: 0 }}
                          >
                            {t('quickActions.upcomingBills.viewAll')}
                          </Button>
                        </Box>
                      </>
                    )}
                  </Box>
                </Box>
              </Grid>

              {/* Goals Progress — still a teaser */}
              <Grid item xs={12} md={4}>
                <Box sx={{ height: 240, display: 'flex', flexDirection: 'column' }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <GoalIcon sx={{ fontSize: 24, color: '#10b981' }} />
                    <Typography variant="h6" fontWeight={600}>{t('quickActions.goalProgress.title')}</Typography>
                  </Box>
                  <Box sx={sectionFrame('#10b981')}>
                    {isLoading ? (
                      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CircularProgress size={22} />
                      </Box>
                    ) : activeGoals.length === 0 ? (
                      <Box
                        sx={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                          textAlign: 'center',
                        }}
                      >
                        <GoalIcon sx={{ fontSize: 40, color: 'rgba(16, 185, 129, 0.3)' }} />
                        <Typography variant="body2" color="text.secondary" textAlign="center">
                          {t('quickActions.goalProgress.description')}
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={() => navigate('/planning')}
                          sx={{ borderColor: '#10b981', color: '#10b981', textTransform: 'none' }}
                        >
                          {t('quickActions.goalProgress.button')}
                        </Button>
                      </Box>
                    ) : (
                      <>
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.25, minHeight: 0, justifyContent: 'center' }}>
                          {activeGoals.slice(0, 3).map((goal) => {
                            const progress = goalProgress(Number(goal.currentAmount), Number(goal.targetAmount));
                            return (
                              <Box key={goal.id}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                                  <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                                    {goal.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                    {Math.round(progress.ratio * 100)}%
                                  </Typography>
                                </Box>
                                <Box sx={{ mt: 0.5, height: 8, borderRadius: '4px', background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                  <Box
                                    sx={{
                                      width: `${progress.percent}%`,
                                      height: '100%',
                                      background: goal.color || '#10b981',
                                    }}
                                  />
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                        <Button
                          size="small"
                          onClick={() => navigate('/planning')}
                          sx={{ color: '#10b981', textTransform: 'none', alignSelf: 'flex-start', minWidth: 0, px: 0, mt: 1 }}
                        >
                          {t('quickActions.goalProgress.viewAll')}
                        </Button>
                      </>
                    )}
                  </Box>
                </Box>
              </Grid>

              {/* Budget Status — live once a limit exists */}
              <Grid item xs={12} md={4}>
                <Box sx={{ height: 240, display: 'flex', flexDirection: 'column' }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <BudgetIcon sx={{ fontSize: 24, color: BUDGET_ACCENT }} />
                    <Typography variant="h6" fontWeight={600}>{t('quickActions.budgetStatus.title')}</Typography>
                  </Box>

                  <Box sx={sectionFrame(BUDGET_ACCENT)}>
                    {isLoading ? (
                      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CircularProgress size={22} />
                      </Box>
                    ) : !budget.hasLimit ? (
                      <Box
                        sx={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                          textAlign: 'center',
                        }}
                      >
                        <BudgetIcon sx={{ fontSize: 40, color: 'rgba(99, 102, 241, 0.3)' }} />
                        <Typography variant="body2" color="text.secondary" textAlign="center">
                          {t('quickActions.budgetStatus.description')}
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={() => navigate('/planning')}
                          sx={{ borderColor: BUDGET_ACCENT, color: BUDGET_ACCENT, textTransform: 'none' }}
                        >
                          {t('quickActions.budgetStatus.button')}
                        </Button>
                      </Box>
                    ) : (
                      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {t('quickActions.budgetStatus.spentOf', {
                            spent: formatCurrency(monthSpent),
                            limit: formatCurrency(limit),
                          })}
                        </Typography>

                        {/* Solid = spent, hatched = committed to open bills. */}
                        <Box sx={{ display: 'flex', gap: '2px', height: 12, borderRadius: '6px', overflow: 'hidden', background: 'rgba(0,0,0,0.06)' }}>
                          {budget.spentPct > 0 && (
                            <Box sx={{ width: `${budget.spentPct}%`, background: EXPENSE_POLE }} />
                          )}
                          {budget.committedPct > 0 && (
                            <Box sx={{ width: `${budget.committedPct}%`, background: HATCH }} />
                          )}
                        </Box>

                        {budget.overBy > 0 ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <OverdueIcon sx={{ fontSize: 15, color: OVERDUE_INK }} />
                            <Typography variant="caption" sx={{ color: OVERDUE_INK, fontWeight: 700 }}>
                              {t('quickActions.budgetStatus.overBy', { amount: formatCurrency(budget.overBy) })}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            {t('quickActions.budgetStatus.remaining', {
                              amount: formatCurrency(budget.remaining),
                            })}
                          </Typography>
                        )}

                        <Button
                          size="small"
                          onClick={() => navigate('/planning')}
                          sx={{ color: BUDGET_ACCENT, textTransform: 'none', alignSelf: 'flex-start', minWidth: 0, px: 0 }}
                        >
                          {t('quickActions.budgetStatus.details')}
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default QuickActions;
