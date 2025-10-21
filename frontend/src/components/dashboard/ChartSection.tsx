import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Skeleton,
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
}) => {
  // Generate mock data if none provided
  const defaultMonthlyData = [
    { month: 'Jan', income: 3000, expenses: 2200, netAmount: 800, savingsRate: 26.7 },
    { month: 'Feb', income: 3200, expenses: 2400, netAmount: 800, savingsRate: 25.0 },
    { month: 'Mar', income: 2800, expenses: 2100, netAmount: 700, savingsRate: 25.0 },
    { month: 'Apr', income: 3400, expenses: 2600, netAmount: 800, savingsRate: 23.5 },
    { month: 'May', income: 3100, expenses: 2300, netAmount: 800, savingsRate: 25.8 },
    { month: 'Jun', income: 3300, expenses: 2500, netAmount: 800, savingsRate: 24.2 },
  ];

  const defaultCategoryData = [
    { name: 'Food & Dining', value: 850, color: COLORS[0] },
    { name: 'Transportation', value: 420, color: COLORS[1] },
    { name: 'Shopping', value: 380, color: COLORS[2] },
    { name: 'Bills & Utilities', value: 650, color: COLORS[3] },
    { name: 'Entertainment', value: 280, color: COLORS[4] },
    { name: 'Others', value: 320, color: COLORS[5] },
  ];

  const chartMonthlyData = monthlyData.length > 0 ? monthlyData : defaultMonthlyData;
  const chartCategoryData = categoryData.length > 0 ? categoryData : defaultCategoryData;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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

  // Generate budget data for budget vs actual chart
  const budgetData = [
    { category: 'Food & Dining', actual: 850, budget: 900 },
    { category: 'Transportation', actual: 420, budget: 400 },
    { category: 'Shopping', actual: 380, budget: 300 },
    { category: 'Bills & Utilities', actual: 650, budget: 700 },
    { category: 'Entertainment', actual: 280, budget: 250 },
  ];

  return (
    <Grid container spacing={3}>
      {/* Spending by Category */}
      <Grid item xs={12} lg={6}>
        <ChartCard title="Spending by Category" isLoading={isLoading}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartCategoryData}
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
                {chartCategoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </Grid>

      {/* Cash Flow Trend */}
      <Grid item xs={12} lg={6}>
        <ChartCard title="Cash Flow Trend" isLoading={isLoading}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartMonthlyData}>
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

      {/* Savings Rate Over Time */}
      <Grid item xs={12} lg={6}>
        <ChartCard title="Savings Rate Over Time" isLoading={isLoading}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartMonthlyData}>
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

      {/* Budget vs Actual */}
      <Grid item xs={12} lg={6}>
        <ChartCard title="Budget vs Actual Spending" isLoading={isLoading}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={budgetData}>
              <CartesianGrid strokeDasharray="5 5" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="category"
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
                dataKey="budget" 
                fill="#10b981" 
                name="Budget" 
                radius={[4, 4, 0, 0]}
                opacity={0.7}
              />
              <Bar 
                dataKey="actual" 
                fill="#4657D8" 
                name="Actual" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </Grid>
    </Grid>
  );
};

export default ChartSection;