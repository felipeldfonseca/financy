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

const COLORS = ['#45b8d7', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];

const ChartCard: React.FC<{
  title: string;
  children: React.ReactNode;
  isLoading?: boolean;
}> = ({ title, children, isLoading = false }) => (
  <Card sx={{ height: '400px' }}>
    <CardContent sx={{ height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {isLoading ? (
        <Box sx={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Skeleton variant="rectangular" width="100%" height="100%" />
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
    { month: 'Jan', income: 3000, expenses: 2200 },
    { month: 'Feb', income: 3200, expenses: 2400 },
    { month: 'Mar', income: 2800, expenses: 2100 },
    { month: 'Apr', income: 3400, expenses: 2600 },
    { month: 'May', income: 3100, expenses: 2300 },
    { month: 'Jun', income: 3300, expenses: 2500 },
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
              {entry.name}: {formatCurrency(entry.value)}
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
            {formatCurrency(data.value)}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Grid container spacing={3}>
      {/* Monthly Trend Chart */}
      <Grid item xs={12} lg={8}>
        <ChartCard title="Monthly Spending Trends" isLoading={isLoading}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartMonthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#666"
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#4caf50"
                strokeWidth={2}
                dot={{ fill: '#4caf50', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Income"
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="#f44336"
                strokeWidth={2}
                dot={{ fill: '#f44336', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Expenses"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </Grid>

      {/* Category Breakdown Chart */}
      <Grid item xs={12} lg={4}>
        <ChartCard title="Spending by Category" isLoading={isLoading}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartCategoryData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
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

      {/* Income vs Expenses Bar Chart */}
      <Grid item xs={12}>
        <ChartCard title="Income vs Expenses Comparison" isLoading={isLoading}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartMonthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#666"
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="income" fill="#4caf50" name="Income" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#f44336" name="Expenses" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </Grid>
    </Grid>
  );
};

export default ChartSection;