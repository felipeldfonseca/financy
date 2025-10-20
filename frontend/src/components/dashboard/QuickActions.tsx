import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  SwapHoriz as SwitchIcon,
  Receipt as ReceiptIcon,
  Schedule as PendingIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  status: 'pending' | 'confirmed';
}

interface QuickActionsProps {
  recentTransactions?: Transaction[];
  pendingCount?: number;
  onAddTransaction?: () => void;
  onSwitchContext?: () => void;
  activeContext?: string;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  recentTransactions = [],
  pendingCount = 0,
  onAddTransaction,
  onSwitchContext,
  activeContext = 'Personal',
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Mock recent transactions if none provided
  const defaultTransactions: Transaction[] = [
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
  ];

  const displayTransactions = recentTransactions.length > 0 ? recentTransactions : defaultTransactions;

  return (
    <Grid container spacing={3}>
      {/* Quick Actions Card */}
      <Grid item xs={12} md={6}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                fullWidth
                size="large"
                onClick={onAddTransaction}
                sx={{ mb: 2 }}
              >
                Add Transaction
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<SwitchIcon />}
                fullWidth
                onClick={onSwitchContext}
              >
                Switch Context
              </Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Active Context */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Active Context
              </Typography>
              <Chip
                label={activeContext}
                color="primary"
                variant="outlined"
                icon={<SwitchIcon />}
              />
            </Box>

            {/* Pending Actions */}
            {pendingCount > 0 && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Pending Actions
                </Typography>
                <Chip
                  label={
                    <Box component="span">
                      <Typography component="span" variant="numeric">{pendingCount}</Typography>
                      {' pending transactions'}
                    </Box>
                  }
                  color="warning"
                  variant="outlined"
                  icon={<PendingIcon />}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Activity Card */}
      <Grid item xs={12} md={6}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            
            <List sx={{ p: 0 }}>
              {displayTransactions.slice(0, 5).map((transaction, index) => (
                <ListItem
                  key={transaction.id}
                  sx={{
                    px: 0,
                    borderBottom: index < displayTransactions.length - 1 ? 1 : 0,
                    borderColor: 'divider',
                  }}
                >
                  <ListItemIcon>
                    <ReceiptIcon
                      sx={{
                        color: transaction.type === 'income' ? 'success.main' : 'error.main',
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" noWrap sx={{ flex: 1, mr: 1 }}>
                          {transaction.description}
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          sx={{
                            color: transaction.type === 'income' ? 'success.main' : 'error.main',
                          }}
                        >
                          {transaction.type === 'income' ? '+' : '-'}
                          <Typography component="span" variant="numeric">{formatCurrency(transaction.amount)}</Typography>
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(transaction.date)}
                        </Typography>
                        {transaction.status === 'pending' && (
                          <Chip
                            label="Pending"
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>

            {displayTransactions.length === 0 && (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 4,
                  color: 'text.secondary',
                }}
              >
                <TrendingIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                <Typography variant="body2">
                  No recent transactions
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default QuickActions;