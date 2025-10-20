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
  TrendingUp as IncomeIcon,
  TrendingDown as ExpenseIcon,
  AccountBalance as BalanceIcon,
  Receipt as TransactionIcon,
} from '@mui/icons-material';

interface SummaryData {
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  transactionCount: number;
}

interface SummaryCardsProps {
  data?: SummaryData;
  isLoading?: boolean;
}

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  isLoading?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  icon,
  color,
  isLoading = false,
}) => (
  <Card
    sx={{
      height: '120px',
      transition: 'transform 0.2s ease-in-out',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: 3,
      },
    }}
  >
    <CardContent sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          {isLoading ? (
            <Skeleton variant="text" width={80} height={32} />
          ) : (
            <Typography variant="h5" fontWeight="bold" sx={{ color }}>
              {value}
            </Typography>
          )}
        </Box>
        <Box sx={{ color, opacity: 0.8 }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const SummaryCards: React.FC<SummaryCardsProps> = ({ data, isLoading = false }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const summaryItems = [
    {
      title: 'Total Income',
      value: data ? formatCurrency(data.totalIncome) : '$0',
      icon: <IncomeIcon sx={{ fontSize: 40 }} />,
      color: '#4caf50', // success.main
    },
    {
      title: 'Total Expenses',
      value: data ? formatCurrency(Math.abs(data.totalExpenses)) : '$0',
      icon: <ExpenseIcon sx={{ fontSize: 40 }} />,
      color: '#f44336', // error.main
    },
    {
      title: 'Net Amount',
      value: data ? formatCurrency(data.netAmount) : '$0',
      icon: <BalanceIcon sx={{ fontSize: 40 }} />,
      color: data && data.netAmount >= 0 ? '#4caf50' : '#f44336',
    },
    {
      title: 'Transactions',
      value: data ? data.transactionCount.toString() : '0',
      icon: <TransactionIcon sx={{ fontSize: 40 }} />,
      color: '#45b8d7', // primary.main
    },
  ];

  return (
    <Grid container spacing={3}>
      {summaryItems.map((item, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <SummaryCard
            title={item.title}
            value={item.value}
            icon={item.icon}
            color={item.color}
            isLoading={isLoading}
          />
        </Grid>
      ))}
    </Grid>
  );
};

export default SummaryCards;