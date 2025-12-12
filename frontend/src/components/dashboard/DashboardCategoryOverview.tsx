import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Tab,
  Tabs,
  useTheme
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { DashboardPieChart } from '../charts/DashboardPieChart';
import { useDashboardCategories } from '../../hooks/useDashboardCategories';
import { Transaction } from '../../services/transactionApi';

interface DashboardCategoryOverviewProps {
  transactions: Transaction[];
  timeframe?: string; // e.g., "thisMonth", "last30days"
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`category-tabpanel-${index}`}
      aria-labelledby={`category-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export const DashboardCategoryOverview: React.FC<DashboardCategoryOverviewProps> = ({
  transactions,
  timeframe
}) => {
  const { t } = useTranslation('transactions');
  const theme = useTheme();
  const { getDashboardCategoryTotalsWithNames } = useDashboardCategories();
  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Calculate totals for each type
  const expenseTransactions = transactions.filter(tx => tx.type === 'expense');
  const incomeTransactions = transactions.filter(tx => tx.type === 'income');
  const transferTransactions = transactions.filter(tx => tx.type === 'transfer');

  const expenseTotals = getDashboardCategoryTotalsWithNames(expenseTransactions, 'expense');
  const incomeTotals = getDashboardCategoryTotalsWithNames(incomeTransactions, 'income');
  const transferTotals = getDashboardCategoryTotalsWithNames(transferTransactions, 'transfer');

  const totalExpenses = expenseTotals.reduce((sum, item) => sum + item.total, 0);
  const totalIncome = incomeTotals.reduce((sum, item) => sum + item.total, 0);
  const totalTransfers = transferTotals.reduce((sum, item) => sum + item.total, 0);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {t('dashboard.categoryOverview', 'Category Overview')}
          {timeframe && (
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              ({t(`filters.timePeriod.${timeframe}`, timeframe)})
            </Typography>
          )}
        </Typography>

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined" sx={{ backgroundColor: alpha(theme.palette.error.main, 0.1) }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="error.main">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    notation: 'compact',
                    maximumFractionDigits: 1
                  }).format(totalExpenses)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('form.type.expense')} ({expenseTotals.filter(item => item.total > 0).length} {t('dashboard.categories', 'categories')})
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined" sx={{ backgroundColor: alpha(theme.palette.success.main, 0.1) }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="success.main">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    notation: 'compact',
                    maximumFractionDigits: 1
                  }).format(totalIncome)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('form.type.income')} ({incomeTotals.filter(item => item.total > 0).length} {t('dashboard.categories', 'categories')})
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined" sx={{ backgroundColor: alpha(theme.palette.info.main, 0.1) }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="info.main">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    notation: 'compact',
                    maximumFractionDigits: 1
                  }).format(totalTransfers)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('form.type.transfer')} ({transferTotals.filter(item => item.total > 0).length} {t('dashboard.categories', 'categories')})
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs for different transaction types */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="category breakdown tabs">
            <Tab label={t('form.type.expense')} />
            <Tab label={t('form.type.income')} />
            <Tab label={t('form.type.transfer')} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <DashboardPieChart
            transactions={transactions}
            type="expense"
            showList={true}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <DashboardPieChart
            transactions={transactions}
            type="income"
            showList={true}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <DashboardPieChart
            transactions={transactions}
            type="transfer"
            showList={true}
          />
        </TabPanel>
      </CardContent>
    </Card>
  );
};

// Helper function to create alpha color (you can import this from MUI if available)
function alpha(color: string, alpha: number): string {
  // Simple alpha implementation for demo
  // In real app, use MUI's alpha function
  return color + Math.round(alpha * 255).toString(16).padStart(2, '0');
}