import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Alert,
  LinearProgress,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Fab,
} from '@mui/material';
import {
  Person as PersonIcon,
  Logout as LogoutIcon,
  HelpOutline as HelpIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useFinancialContexts } from '../contexts/ContextsContext';
import { PeriodFilter } from '../components/dashboard/PeriodFilter';
import { MemberSpendingCard, MemberSpending } from '../components/dashboard/MemberSpendingCard';
import {
  DashboardPeriod,
  periodRange,
  periodMonths,
  cumulativeFromCalendar,
  hasMonthlyHistory,
  EvolutionPoint,
} from '../utils/dashboardPeriod';
import SummaryCards from '../components/dashboard/SummaryCards';
import ChartSection from '../components/dashboard/ChartSection';
import QuickActions from '../components/dashboard/QuickActions';
import ContextSwitcher from '../components/dashboard/ContextSwitcher';
import ExpandableAddButton from '../components/common/ExpandableAddButton';
import DashboardEmptyState from '../components/dashboard/DashboardEmptyState';
import { OnboardingWizard } from '../components/onboarding';
import { transactionApi } from '../services/transactionApi';

interface DashboardData {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netAmount: number;
    transactionCount: number;
  };
  categoryData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  recentTransactions: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    type: 'income' | 'expense';
    status: 'pending' | 'confirmed' | 'cancelled';
  }>;
}

const DashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation('dashboard');
  const { state, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { contexts, selectedContextId, selectContext } = useFinancialContexts();
  // "Groups mode with nothing picked yet" needs its own flag, so the empty
  // state can show; once a group is selected, the global selection rules.
  const [groupsModeRequested, setGroupsModeRequested] = useState(false);

  const groups = React.useMemo(
    () => contexts.filter((context) => context.type !== 'personal' && context.isActive),
    [contexts],
  );
  const selectedGroup = React.useMemo(
    () => groups.find((group) => group.id === selectedContextId) ?? null,
    [groups, selectedContextId],
  );
  const contextType: 'personal' | 'groups' =
    selectedGroup || groupsModeRequested ? 'groups' : 'personal';

  // Which window the whole dashboard reads. Monthly is the default; with
  // too little history the page falls back to this month's run — once.
  const [period, setPeriod] = useState<DashboardPeriod>('6m');
  const [evolution, setEvolution] = useState<
    { mode: 'monthly' | 'daily'; points: EvolutionPoint[] } | undefined
  >(undefined);
  const [memberSpending, setMemberSpending] = useState<MemberSpending[]>([]);
  const autoFallbackDone = React.useRef(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasTransactions, setHasTransactions] = useState(false);

  useEffect(() => {
    // Check if user needs onboarding
    if (state.user && !state.user.onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [state.user]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);

        // The period filter decides the window for everything below.
        const { startDate, endDate } = periodRange(period);

        const [response, monthlySeries, calendarDays, members] = await Promise.all([
          transactionApi.getTransactions({
            startDate,
            endDate,
            page: 1,
            limit: 100,
            sortBy: 'date',
            sortOrder: 'DESC',
            contextId: selectedGroup?.id,
          }),
          period !== 'this-month'
            ? transactionApi.getMonthly(periodMonths(period), selectedGroup?.id).catch(() => null)
            : Promise.resolve(null),
          period === 'this-month'
            ? transactionApi.getCalendar(endDate.slice(0, 7), selectedGroup?.id).catch(() => null)
            : Promise.resolve(null),
          selectedGroup
            ? transactionApi.getByMember(selectedGroup.id, startDate, endDate).catch(() => [])
            : Promise.resolve([]),
        ]);

        // Not enough months to draw a trend: fall back to this month's
        // day-by-day run, once — the user can still pick any period by hand.
        if (monthlySeries && !hasMonthlyHistory(monthlySeries) && !autoFallbackDone.current) {
          autoFallbackDone.current = true;
          setPeriod('this-month');
          return;
        }

        setMemberSpending(members);

        if (monthlySeries) {
          setEvolution({
            mode: 'monthly',
            points: monthlySeries.map((entry) => ({
              label: new Date(`${entry.month}-01T12:00:00Z`).toLocaleDateString(i18n.language, {
                month: 'short',
              }),
              income: entry.income,
              expense: entry.expense,
            })),
          });
        } else if (calendarDays) {
          setEvolution({ mode: 'daily', points: cumulativeFromCalendar(calendarDays, endDate) });
        }

        // Check if user has any transactions
        const hasData = response.transactions.length > 0;
        setHasTransactions(hasData);

        if (hasData) {
          // Transform API data to dashboard format
          const categoryColors = ['#45b8d7', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];

          const dashboardData: DashboardData = {
            summary: {
              totalIncome: response.summary.totalIncome,
              totalExpenses: Math.abs(response.summary.totalExpenses),
              netAmount: response.summary.netAmount,
              transactionCount: response.summary.transactionCount,
            },
            categoryData: response.summary.categories.map((cat, index) => ({
              name: cat.category || 'Uncategorized',
              value: Math.abs(cat.amount),
              color: categoryColors[index % categoryColors.length],
            })),
            recentTransactions: response.transactions.slice(0, 5).map(t => ({
              id: t.id,
              description: t.description,
              amount: t.amount,
              date: t.date,
              type: t.type === 'income' ? 'income' : 'expense',
              status: t.status,
            })),
          };

          setData(dashboardData);
        }

        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || t('errors.failedToLoad'));
        console.error('Dashboard data loading error:', err);
        setHasTransactions(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (state.isAuthenticated) {
      loadDashboardData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isAuthenticated, selectedGroup?.id, period]);

  const handleAddTransaction = () => {
    navigate('/transactions');
  };

  const handleConnectTelegram = () => {
    navigate('/settings/telegram');
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const handleReopenOnboarding = () => {
    setShowOnboarding(true);
  };

  const handleContextTypeChange = (type: 'personal' | 'groups') => {
    if (type === 'personal') {
      setGroupsModeRequested(false);
      selectContext(undefined);
      return;
    }

    setGroupsModeRequested(true);
    // Landing in groups mode with nothing picked: the first group is the
    // natural start; with none, the picker shows how to create one.
    if (!selectedGroup && groups.length > 0) {
      selectContext(groups[0].id);
    }
  };

  const handleGroupSelect = (group: { id: string }) => {
    selectContext(group.id);
  };


  // Determine if it's user's first visit (within 24 hours of registration)
  const isFirstVisit = () => {
    if (!state.user?.createdAt) return false;
    const createdAt = new Date(state.user.createdAt);
    const now = new Date();
    const hoursSinceRegistration = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceRegistration <= 24;
  };

  const getWelcomeMessage = () => {
    if (!state.user?.firstName) return t('welcome.back');
    const capitalizedFirstName = state.user.firstName.charAt(0).toUpperCase() + state.user.firstName.slice(1).toLowerCase();
    return isFirstVisit() 
      ? t('welcome.withName', { name: capitalizedFirstName })
      : t('welcome.hello', { name: capitalizedFirstName });
  };

  const getUserInitial = () => {
    return state.user?.firstName?.charAt(0).toUpperCase() || '?';
  };

  const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    handleMenuClose();
    navigate('/settings'); // Navigate to profile/settings page
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    navigate('/');
  };

  return (
    <Box sx={{ py: 4 }}>
      {/* Onboarding Wizard */}
      {showOnboarding && (
        <OnboardingWizard
          open={showOnboarding}
          onComplete={handleOnboardingComplete}
        />
      )}

      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography
            variant="brand"
            component="h1"
            gutterBottom
            sx={{
              color: 'text.primary',
              fontSize: '2.5rem',
            }}
          >
            {getWelcomeMessage()}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {hasTransactions ? t('welcome.overview') : t('welcome.getStarted')}
          </Typography>
        </Box>
        
        {/* Action Buttons and User Avatar */}
        {state.user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <ExpandableAddButton
              onAddTransaction={handleAddTransaction}
              contextType={contextType}
              selectedGroupName={selectedGroup?.name}
            />
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: 'primary.main',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              }}
              onClick={handleAvatarClick}
            >
              {getUserInitial()}
            </Avatar>
            
            {/* User Menu Dropdown */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              onClick={handleMenuClose}
              PaperProps={{
                elevation: 3,
                sx: {
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                  mt: 1.5,
                  minWidth: 180,
                  '&:before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    right: 14,
                    width: 10,
                    height: 10,
                    bgcolor: 'background.paper',
                    transform: 'translateY(-50%) rotate(45deg)',
                    zIndex: 0,
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={handleProfileClick}>
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t('welcome.myProfile')}</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t('welcome.logOut')}</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Box>

      {/* Loading Indicator */}
      {isLoading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress />
        </Box>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* The switcher never hides: it is how the user gets anywhere else. */}
      {!isLoading && (
        <Box sx={{ mb: 3 }}>
          <ContextSwitcher
            contextType={contextType}
            groups={groups}
            selectedGroupId={selectedGroup?.id}
            onContextTypeChange={handleContextTypeChange}
            onGroupSelect={handleGroupSelect}
          />
        </Box>
      )}

      {/* Empty State or Dashboard Content */}
      {!isLoading && (
        contextType === 'personal' && !hasTransactions ? (
          <DashboardEmptyState
            onAddTransaction={handleAddTransaction}
            onConnectTelegram={handleConnectTelegram}
            isTelegramLinked={!!state.user?.isTelegramLinked}
          />
        ) : (
          <>
            {/* Period filter — anchored right, just above the cards it drives */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <PeriodFilter value={period} onChange={setPeriod} />
            </Box>

            {/* Summary Cards */}
            <Box sx={{ mb: 4 }}>
              <SummaryCards data={data?.summary} isLoading={isLoading} userCurrency={state.user?.defaultCurrency} />
            </Box>

            {/* Smart Insights */}
            <Box sx={{ mb: 4 }}>
              <QuickActions
                contextType={contextType}
                selectedGroupName={selectedGroup?.name}
                contextId={contextType === 'groups' ? selectedGroup?.id : undefined}
              />
            </Box>

            {/* Who spent — the group-only chart */}
            {selectedGroup && memberSpending.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <MemberSpendingCard
                  members={memberSpending}
                  currency={state.user?.defaultCurrency || 'BRL'}
                  periodLabel={t(`periodFilter.${period === 'this-month' ? 'thisMonth' : period === '6m' ? 'sixMonths' : 'twelveMonths'}`)}
                />
              </Box>
            )}

            {/* Charts Section */}
            <Box>
              <ChartSection
                evolution={evolution}
                categoryData={data?.categoryData}
                isLoading={isLoading}
                userCurrency={state.user?.defaultCurrency}
                totalIncome={data?.summary?.totalIncome || 0}
                totalExpenses={data?.summary?.totalExpenses || 0}
                transactionCount={data?.summary?.transactionCount || 0}
              />
            </Box>
          </>
        )
      )}

      {/* Floating Help Button - Only shows when no transactions */}
      {!isLoading && contextType === 'personal' && !hasTransactions && (
        <Fab
          color="primary"
          aria-label="help"
          onClick={handleReopenOnboarding}
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            width: 56,
            height: 56,
          }}
        >
          <HelpIcon sx={{ fontSize: 28 }} />
        </Fab>
      )}
    </Box>
  );
};

export default DashboardPage;