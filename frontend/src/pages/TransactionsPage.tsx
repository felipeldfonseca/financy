import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Stack,
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
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h5" fontWeight="bold" sx={{ color }}>
            {value}
          </Typography>
        </Box>
        <Box sx={{ color }}>{icon}</Box>
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
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Transactions
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddTransaction}
          size="large"
        >
          Add Transaction
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <TransactionsSummaryCard
            title="Total Income"
            value={formatCurrency(summary.totalIncome)}
            icon={<IncomeIcon sx={{ fontSize: 40 }} />}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TransactionsSummaryCard
            title="Total Expenses"
            value={formatCurrency(summary.totalExpenses)}
            icon={<ExpenseIcon sx={{ fontSize: 40 }} />}
            color="error.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TransactionsSummaryCard
            title="Net Amount"
            value={formatCurrency(summary.netAmount)}
            icon={<BalanceIcon sx={{ fontSize: 40 }} />}
            color={summary.netAmount >= 0 ? 'success.main' : 'error.main'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TransactionsSummaryCard
            title="Total Transactions"
            value={summary.transactionCount.toString()}
            icon={<TransactionIcon sx={{ fontSize: 40 }} />}
            color="primary.main"
          />
        </Grid>
      </Grid>

      {/* Error Display */}
      {state.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {state.error}
        </Alert>
      )}

      {/* Loading Indicator */}
      {state.isLoading && (
        <Box mb={2}>
          <LinearProgress />
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
    </Container>
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