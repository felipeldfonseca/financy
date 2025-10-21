import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  TrendingUp as IncomeIcon,
  TrendingDown as ExpenseIcon,
  AccountBalance as BalanceIcon,
  Receipt as TransactionIcon,
} from '@mui/icons-material';
import { TransactionProvider, useTransactions } from '../contexts/TransactionContext';
import { TransactionForm } from '../components/transactions/TransactionForm';
import { TransactionList } from '../components/transactions/TransactionList';
import { TransactionFiltersComponent } from '../components/transactions/TransactionFilters';
import { Transaction, TransactionFilters } from '../services/transactionApi';

const TransactionsSummaryCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => (
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
          {value}
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

const TransactionsPageContent: React.FC = () => {
  const { state, loadTransactions, setFilters } = useTransactions();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleFiltersChange = (filters: TransactionFilters) => {
    setFilters(filters);
    loadTransactions(filters);
  };

  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setFormOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingTransaction(null);
    // Reload transactions to reflect changes
    loadTransactions(state.filters);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const { summary } = state;

  return (
    <Box sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography 
          variant="brand" 
          component="h1" 
          gutterBottom
          sx={{ 
            color: 'text.primary',
            fontSize: '2.5rem',
          }}
        >
          Transactions
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddTransaction}
          size="large"
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1.5,
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 12px 40px rgba(102, 126, 234, 0.4)',
              background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
            },
          }}
        >
          Add Transaction
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={4} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <TransactionsSummaryCard
            title="Total Income"
            value={formatCurrency(summary.totalIncome)}
            icon={<IncomeIcon sx={{ fontSize: 40 }} />}
            color="#10b981"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TransactionsSummaryCard
            title="Total Expenses"
            value={formatCurrency(summary.totalExpenses)}
            icon={<ExpenseIcon sx={{ fontSize: 40 }} />}
            color="#ef4444"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TransactionsSummaryCard
            title="Net Amount"
            value={formatCurrency(summary.netAmount)}
            icon={<BalanceIcon sx={{ fontSize: 40 }} />}
            color={summary.netAmount >= 0 ? '#10b981' : '#ef4444'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TransactionsSummaryCard
            title="Total Transactions"
            value={summary.transactionCount.toString()}
            icon={<TransactionIcon sx={{ fontSize: 40 }} />}
            color="#6366f1"
          />
        </Grid>
      </Grid>

      {/* Error Display */}
      {state.error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3,
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '16px',
            color: 'text.primary',
          }}
        >
          {state.error}
        </Alert>
      )}

      {/* Loading Indicator */}
      {state.isLoading && (
        <Box mb={2}>
          <LinearProgress 
            sx={{
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              },
            }}
          />
        </Box>
      )}

      {/* Filters */}
      <Box mb={3}>
        <TransactionFiltersComponent onFiltersChange={handleFiltersChange} />
      </Box>

      {/* Transaction List */}
      <TransactionList onEditTransaction={handleEditTransaction} />

      {/* Transaction Form Modal */}
      <TransactionForm
        open={formOpen}
        onClose={handleFormClose}
        transaction={editingTransaction}
        mode={editingTransaction ? 'edit' : 'create'}
      />
    </Box>
  );
};

const TransactionsPage: React.FC = () => {
  return (
    <TransactionProvider>
      <TransactionsPageContent />
    </TransactionProvider>
  );
};

export default TransactionsPage;