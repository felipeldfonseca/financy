import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Skeleton,
} from '@mui/material';
import {
  ArrowUpward as IncomeIcon,
  ArrowDownward as ExpenseIcon,
  AccountBalanceWallet as BalanceIcon,
  SwapVerticalCircle as TransactionIcon,
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
  numericValue: number;
  icon: React.ReactNode;
  color: string;
  isLoading?: boolean;
}

const AnimatedCounter: React.FC<{ value: number; duration?: number }> = ({ 
  value, 
  duration = 1000 
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const updateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      setCount(Math.floor(progress * value));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(updateCount);
      }
    };

    animationFrame = requestAnimationFrame(updateCount);
    
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{count}</span>;
};

const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  numericValue,
  icon,
  color,
  isLoading = false,
}) => (
  <Card
    sx={{
      height: '140px',
      background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '20px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      overflow: 'hidden',
      '&:hover': {
        transform: 'translateY(-8px) scale(1.02)',
        boxShadow: `0 20px 40px rgba(${color.replace('#', '').match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ')}, 0.15)`,
        '&::before': {
          opacity: 1,
        },
      },
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
        opacity: 0,
        transition: 'opacity 0.3s ease',
        zIndex: 0,
      },
    }}
  >
    <CardContent sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      zIndex: 1,
      p: 3,
    }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            fontWeight: 500,
            fontSize: '0.875rem',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </Typography>
        <Box 
          sx={{ 
            color: color,
            opacity: 0.7,
            p: 1,
            borderRadius: '12px',
            background: `${color}10`,
            transition: 'all 0.3s ease',
            '&:hover': {
              opacity: 1,
              transform: 'rotate(5deg) scale(1.1)',
            },
          }}
        >
          {icon}
        </Box>
      </Box>
      
      <Box>
        {isLoading ? (
          <Skeleton variant="text" width={120} height={40} sx={{ borderRadius: '8px' }} />
        ) : (
          <Typography 
            variant="numeric" 
            fontWeight="bold" 
            sx={{ 
              color: 'text.primary',
              fontSize: '2rem',
              lineHeight: 1.2,
              display: 'flex',
              alignItems: 'baseline',
              gap: 0.5,
            }}
          >
            {title === 'Transactions' ? (
              <AnimatedCounter value={numericValue} duration={1500} />
            ) : (
              value
            )}
          </Typography>
        )}
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
      numericValue: data ? data.totalIncome : 0,
      icon: <IncomeIcon sx={{ fontSize: 24 }} />,
      color: '#10b981', // Modern green
    },
    {
      title: 'Total Expenses',
      value: data ? formatCurrency(Math.abs(data.totalExpenses)) : '$0',
      numericValue: data ? Math.abs(data.totalExpenses) : 0,
      icon: <ExpenseIcon sx={{ fontSize: 24 }} />,
      color: '#ef4444', // Modern red
    },
    {
      title: 'Net Amount',
      value: data ? formatCurrency(data.netAmount) : '$0',
      numericValue: data ? data.netAmount : 0,
      icon: <BalanceIcon sx={{ fontSize: 24 }} />,
      color: data && data.netAmount >= 0 ? '#10b981' : '#ef4444',
    },
    {
      title: 'Transactions',
      value: data ? data.transactionCount.toString() : '0',
      numericValue: data ? data.transactionCount : 0,
      icon: <TransactionIcon sx={{ fontSize: 24 }} />,
      color: '#6366f1', // Modern purple
    },
  ];

  return (
    <Grid container spacing={4}>
      {summaryItems.map((item, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <SummaryCard
            title={item.title}
            value={item.value}
            numericValue={item.numericValue}
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