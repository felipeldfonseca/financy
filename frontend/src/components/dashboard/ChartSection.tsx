import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Skeleton,
  LinearProgress,
  SvgIcon,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

// Elegant SVG Icons
const ChartUnlockIcon: React.FC<{ sx?: any }> = ({ sx }) => (
  <SvgIcon sx={sx} viewBox="0 0 24 24">
    <path
      d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"
      fill="currentColor"
      opacity="0.3"
    />
    <path
      d="M13 3v6h8V3h-8zm2 4V5h4v2h-4zm-4 8v6h8v-6h-8zm2 4v-2h4v2h-4zM3 13h8V3H3v10zm2-8h4v6H5V5zm-2 8h8v6H3v-6zm2 4h4v-2H5v2z"
      fill="currentColor"
    />
  </SvgIcon>
);

const InsightIcon: React.FC<{ sx?: any }> = ({ sx }) => (
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

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  netAmount: number;
  savingsRate: number; // percentage
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface ChartSectionProps {
  monthlyData?: MonthlyData[];
  categoryData?: CategoryData[];
  isLoading?: boolean;
  userCurrency?: string;
  totalIncome?: number;
  totalExpenses?: number;
  transactionCount?: number;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const ChartCard: React.FC<{
  title: string;
  children: React.ReactNode;
  isLoading?: boolean;
}> = ({ title, children, isLoading = false }) => (
  <Card sx={{ 
    height: '400px',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    },
  }}>
    <CardContent sx={{ height: '100%', p: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ 
        fontWeight: 600,
        mb: 3,
        color: 'text.primary'
      }}>
        {title}
      </Typography>
      {isLoading ? (
        <Box sx={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: '12px' }} />
        </Box>
      ) : (
        <Box sx={{ height: '320px' }}>
          {children}
        </Box>
      )}
    </CardContent>
  </Card>
);

const ChartSection: React.FC<ChartSectionProps> = ({
  monthlyData = [],
  categoryData = [],
  isLoading = false,
  userCurrency = 'USD',
  totalIncome = 0,
  totalExpenses = 0,
  transactionCount = 0,
}) => {
  // Require at least 10 transactions for charts to show
  const MIN_TRANSACTIONS = 10;
  const hasEnoughTransactions = transactionCount >= MIN_TRANSACTIONS;
  const hasAnyTransactions = transactionCount > 0;
  const transactionsRemaining = MIN_TRANSACTIONS - transactionCount;
  const progress = (transactionCount / MIN_TRANSACTIONS) * 100;

  // Check if we have sufficient data for meaningful charts
  const hasMonthlyData = monthlyData.length >= 2; // Need at least 2 data points for trend
  const hasCategoryData = categoryData.length > 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: userCurrency,
      minimumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: 'background.paper',
            p: 1.5,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 2,
          }}
        >
          <Typography variant="body2" fontWeight="bold">
            {label}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Typography
              key={index}
              variant="body2"
              sx={{ color: entry.color }}
            >
              {entry.name}: <Typography component="span" variant="numeric">{formatCurrency(entry.value)}</Typography>
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };


  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <Box
          sx={{
            bgcolor: 'background.paper',
            p: 1.5,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 2,
          }}
        >
          <Typography variant="body2" fontWeight="bold">
            {data.name}
          </Typography>
          <Typography variant="body2" sx={{ color: data.payload.color }}>
            <Typography component="span" variant="numeric">{formatCurrency(data.value)}</Typography>
          </Typography>
        </Box>
      );
    }
    return null;
  };

  // Custom tooltips
  const CashFlowTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: 'background.paper',
            p: 1.5,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 2,
          }}
        >
          <Typography variant="body2" fontWeight="bold">
            {label}
          </Typography>
          <Typography variant="body2" sx={{ color: payload[0].color }}>
            Cash Flow: <Typography component="span" variant="numeric">{formatCurrency(payload[0].value)}</Typography>
          </Typography>
        </Box>
      );
    }
    return null;
  };

  const SavingsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: 'background.paper',
            p: 1.5,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 2,
          }}
        >
          <Typography variant="body2" fontWeight="bold">
            {label}
          </Typography>
          <Typography variant="body2" sx={{ color: payload[0].color }}>
            Savings Rate: <Typography component="span" variant="numeric">{payload[0].value.toFixed(1)}%</Typography>
          </Typography>
        </Box>
      );
    }
    return null;
  };

  // If there's insufficient data, show a progress message
  if (!hasEnoughTransactions && !isLoading) {
    return (
      <Card sx={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        p: 6,
      }}>
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <ChartUnlockIcon sx={{ fontSize: 64, color: 'primary.main', mb: 3, opacity: 0.8 }} />

          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: 'text.primary' }}>
            {transactionCount === 0
              ? 'Start Tracking to Unlock Insights'
              : 'Unlock Powerful Financial Analytics'
            }
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mt: 2 }}>
            {transactionCount === 0
              ? 'Track your transactions to unlock beautiful visualizations that help you understand spending patterns, identify savings opportunities, and make smarter financial decisions.'
              : `Just ${transactionsRemaining} more transaction${transactionsRemaining === 1 ? '' : 's'} to unlock interactive charts showing your income trends, spending breakdown, and financial health insights.`
            }
          </Typography>

          {transactionCount > 0 && (
            <Box sx={{ width: '100%', maxWidth: 400, mt: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Progress
                </Typography>
                <Typography variant="body2" color="primary" fontWeight={600}>
                  {transactionCount}/{MIN_TRANSACTIONS}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(70, 87, 216, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(135deg, #4657D8 0%, #3b47c4 100%)',
                    borderRadius: 4,
                  },
                }}
              />
            </Box>
          )}

          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mt: 4,
            p: 2,
            borderRadius: '12px',
            background: 'rgba(70, 87, 216, 0.05)',
            border: '1px solid rgba(70, 87, 216, 0.1)',
          }}>
            <InsightIcon sx={{ fontSize: 24, color: 'primary.main' }} />
            <Typography variant="body2" color="text.secondary">
              Use the Telegram bot or add transactions manually to unlock insights faster
            </Typography>
          </Box>
        </Box>
      </Card>
    );
  }

  // Prepare data for simple charts that work with minimal data
  const incomeVsExpensesData = [
    { name: 'Income', value: totalIncome, fill: '#10b981' },
    { name: 'Expenses', value: Math.abs(totalExpenses), fill: '#ef4444' },
  ];

  const netAmount = totalIncome - Math.abs(totalExpenses);
  const financialHealthData = [
    { name: 'Saved', value: netAmount > 0 ? netAmount : 0, fill: '#10b981' },
    { name: 'Spent', value: Math.abs(totalExpenses), fill: '#4657D8' },
  ];

  // Top 5 categories for bar chart
  const topCategories = [...categoryData]
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <Grid container spacing={3}>
      {/* Income vs Expenses - Always show if there's any transaction */}
      {hasAnyTransactions && (
        <Grid item xs={12} lg={6}>
          <ChartCard title="Income vs Expenses" isLoading={isLoading}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeVsExpensesData}>
                <CartesianGrid strokeDasharray="5 5" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#8b8b8b' }}
                  stroke="rgba(255,255,255,0.2)"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#8b8b8b' }}
                  stroke="rgba(255,255,255,0.2)"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="value"
                  radius={[8, 8, 0, 0]}
                >
                  {incomeVsExpensesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      )}

      {/* Financial Health - Show saved vs spent */}
      {hasAnyTransactions && netAmount > 0 && (
        <Grid item xs={12} lg={6}>
          <ChartCard title="Financial Health" isLoading={isLoading}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={financialHealthData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={40}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={2}
                >
                  {financialHealthData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      )}

      {/* Top Spending Categories */}
      {topCategories.length > 0 && (
        <Grid item xs={12} lg={6}>
          <ChartCard title="Top Spending Categories" isLoading={isLoading}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCategories}>
                <CartesianGrid strokeDasharray="5 5" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#8b8b8b' }}
                  stroke="rgba(255,255,255,0.2)"
                  axisLine={false}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#8b8b8b' }}
                  stroke="rgba(255,255,255,0.2)"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="value"
                  radius={[8, 8, 0, 0]}
                >
                  {topCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      )}

      {/* Spending by Category */}
      {hasCategoryData && (
        <Grid item xs={12} lg={6}>
          <ChartCard title="Spending Distribution" isLoading={isLoading}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={40}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={2}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      )}

      {/* Cash Flow Trend */}
      {hasMonthlyData && (
        <Grid item xs={12} lg={6}>
          <ChartCard title="Cash Flow Trend" isLoading={isLoading}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="5 5" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#8b8b8b' }}
                  stroke="rgba(255,255,255,0.2)"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#8b8b8b' }}
                  stroke="rgba(255,255,255,0.2)"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatCurrency}
                  domain={['dataMin - 200', 'dataMax + 200']}
                />
                <Tooltip content={<CashFlowTooltip />} />
                <Line
                  type="monotone"
                  dataKey="netAmount"
                  stroke="#4657D8"
                  strokeWidth={3}
                  dot={{ fill: '#4657D8', strokeWidth: 0, r: 5 }}
                  activeDot={{ r: 8, stroke: '#4657D8', strokeWidth: 2, fill: '#ffffff' }}
                  name="Net Amount"
                  strokeDasharray="0"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      )}

      {/* Savings Rate Over Time */}
      {hasMonthlyData && (
        <Grid item xs={12} lg={6}>
          <ChartCard title="Savings Rate Over Time" isLoading={isLoading}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="5 5" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#8b8b8b' }}
                  stroke="rgba(255,255,255,0.2)"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#8b8b8b' }}
                  stroke="rgba(255,255,255,0.2)"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${value}%`}
                  domain={['dataMin - 2', 'dataMax + 2']}
                />
                <Tooltip content={<SavingsTooltip />} />
                <Line
                  type="monotone"
                  dataKey="savingsRate"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', strokeWidth: 0, r: 5 }}
                  activeDot={{ r: 8, stroke: '#10b981', strokeWidth: 2, fill: '#ffffff' }}
                  name="Savings Rate"
                  strokeDasharray="0"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      )}
    </Grid>
  );
};

export default ChartSection;