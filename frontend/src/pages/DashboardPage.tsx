import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Alert,
  LinearProgress,
} from '@mui/material';
import SummaryCards from '../components/dashboard/SummaryCards';
import ChartSection from '../components/dashboard/ChartSection';
import QuickActions from '../components/dashboard/QuickActions';

interface DashboardData {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netAmount: number;
    transactionCount: number;
  };
  monthlyData: Array<{
    month: string;
    income: number;
    expenses: number;
  }>;
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
    status: 'pending' | 'confirmed';
  }>;
}

const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call - replace with actual API call later
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data - replace with actual API call
        const mockData: DashboardData = {
          summary: {
            totalIncome: 8500,
            totalExpenses: 6200,
            netAmount: 2300,
            transactionCount: 47,
          },
          monthlyData: [
            { month: 'Jan', income: 3000, expenses: 2200 },
            { month: 'Feb', income: 3200, expenses: 2400 },
            { month: 'Mar', income: 2800, expenses: 2100 },
            { month: 'Apr', income: 3400, expenses: 2600 },
            { month: 'May', income: 3100, expenses: 2300 },
            { month: 'Jun', income: 3300, expenses: 2500 },
          ],
          categoryData: [
            { name: 'Food & Dining', value: 850, color: '#45b8d7' },
            { name: 'Transportation', value: 420, color: '#4caf50' },
            { name: 'Shopping', value: 380, color: '#ff9800' },
            { name: 'Bills & Utilities', value: 650, color: '#f44336' },
            { name: 'Entertainment', value: 280, color: '#9c27b0' },
            { name: 'Others', value: 320, color: '#00bcd4' },
          ],
          recentTransactions: [
            {
              id: '1',
              description: 'Coffee at Starbucks',
              amount: -5.50,
              date: new Date().toISOString(),
              type: 'expense',
              status: 'confirmed',
            },
            {
              id: '2',
              description: 'Freelance Payment',
              amount: 500,
              date: new Date(Date.now() - 86400000).toISOString(),
              type: 'income',
              status: 'confirmed',
            },
            {
              id: '3',
              description: 'Grocery Shopping',
              amount: -45.30,
              date: new Date(Date.now() - 172800000).toISOString(),
              type: 'expense',
              status: 'pending',
            },
          ],
        };
        
        setData(mockData);
        setError(null);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Dashboard data loading error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const handleAddTransaction = () => {
    // Navigate to transaction form or open modal
    console.log('Add transaction clicked');
  };

  const handleSwitchContext = () => {
    // Open context switcher
    console.log('Switch context clicked');
  };

  const pendingTransactionsCount = data?.recentTransactions.filter(
    t => t.status === 'pending'
  ).length || 0;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back! Here's your financial overview.
        </Typography>
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

      {/* Summary Cards */}
      <Box sx={{ mb: 4 }}>
        <SummaryCards data={data?.summary} isLoading={isLoading} />
      </Box>

      {/* Quick Actions */}
      <Box sx={{ mb: 4 }}>
        <QuickActions
          recentTransactions={data?.recentTransactions}
          pendingCount={pendingTransactionsCount}
          onAddTransaction={handleAddTransaction}
          onSwitchContext={handleSwitchContext}
          activeContext="Personal"
        />
      </Box>

      {/* Charts Section */}
      <Box>
        <ChartSection
          monthlyData={data?.monthlyData}
          categoryData={data?.categoryData}
          isLoading={isLoading}
        />
      </Box>
    </Container>
  );
};

export default DashboardPage;