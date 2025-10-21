import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
} from '@mui/material';
import {
  EventNote as CalendarIcon,
  TrackChanges as GoalIcon,
  Savings as BudgetIcon,
} from '@mui/icons-material';

interface UpcomingBill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  category: string;
}

interface Goal {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  targetDate: string;
  category: string;
}

interface Budget {
  category: string;
  spent: number;
  budget: number;
  color: string;
}

interface QuickActionsProps {
  contextType?: 'personal' | 'groups';
  selectedGroupName?: string;
  upcomingBills?: UpcomingBill[];
  goals?: Goal[];
  budgets?: Budget[];
}

const QuickActions: React.FC<QuickActionsProps> = ({
  contextType = 'personal',
  selectedGroupName,
  upcomingBills = [],
  goals = [],
  budgets = [],
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

  const defaultUpcomingBills: UpcomingBill[] = [
    { id: '1', name: 'Netflix Subscription', amount: 15.99, dueDate: '2024-01-15', category: 'Entertainment' },
    { id: '2', name: 'Electric Bill', amount: 89.50, dueDate: '2024-01-18', category: 'Utilities' },
    { id: '3', name: 'Internet', amount: 65.00, dueDate: '2024-01-20', category: 'Utilities' },
  ];

  const defaultGoals: Goal[] = [
    { id: '1', name: 'Emergency Fund', currentAmount: 3500, targetAmount: 10000, targetDate: '2024-12-31', category: 'Savings' },
    { id: '2', name: 'Vacation Fund', currentAmount: 1200, targetAmount: 3000, targetDate: '2024-06-30', category: 'Travel' },
  ];

  const defaultBudgets: Budget[] = [
    { category: 'Food & Dining', spent: 450, budget: 600, color: '#10b981' },
    { category: 'Transportation', spent: 280, budget: 300, color: '#f59e0b' },
    { category: 'Entertainment', spent: 120, budget: 200, color: '#6366f1' },
  ];

  const displayUpcomingBills = upcomingBills.length > 0 ? upcomingBills : defaultUpcomingBills;
  const displayGoals = goals.length > 0 ? goals : defaultGoals;
  const displayBudgets = budgets.length > 0 ? budgets : defaultBudgets;

  const getSectionTitle = () => {
    if (contextType === 'groups' && selectedGroupName) {
      return `${selectedGroupName} - Smart Insights`;
    }
    return contextType === 'groups' ? 'Group Smart Insights' : 'Smart Insights';
  };

  return (
    <Grid container spacing={4}>
      {/* Smart Insights Card */}
      <Grid item xs={12}>
        <Card sx={{ 
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
        }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              {getSectionTitle()}
            </Typography>
            
            <Grid container spacing={3}>
              {/* Upcoming Bills */}
              <Grid item xs={12} md={4}>
                <Box>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <CalendarIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
                    <Typography variant="body2" fontWeight={500}>Upcoming Bills</Typography>
                  </Box>
                  {displayUpcomingBills.slice(0, 2).map((bill) => (
                    <Box key={bill.id} sx={{ 
                      p: 2, 
                      mb: 1.5,
                      borderRadius: '12px',
                      background: 'rgba(245, 158, 11, 0.05)',
                      border: '1px solid rgba(245, 158, 11, 0.1)',
                    }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight={500}>{bill.name}</Typography>
                        <Typography variant="body2" fontWeight={600} color="#f59e0b">
                          <Typography component="span" variant="numeric">{formatCurrency(bill.amount)}</Typography>
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Due {formatDate(bill.dueDate)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Grid>

              {/* Goals Progress */}
              <Grid item xs={12} md={4}>
                <Box>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <GoalIcon sx={{ fontSize: 18, color: '#10b981' }} />
                    <Typography variant="body2" fontWeight={500}>Goal Progress</Typography>
                  </Box>
                  {displayGoals.slice(0, 1).map((goal) => {
                    const progress = (goal.currentAmount / goal.targetAmount) * 100;
                    return (
                      <Box key={goal.id} sx={{ 
                        p: 2,
                        borderRadius: '12px',
                        background: 'rgba(16, 185, 129, 0.05)',
                        border: '1px solid rgba(16, 185, 129, 0.1)',
                      }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="body2" fontWeight={500}>{goal.name}</Typography>
                          <Typography variant="caption" color="#10b981">
                            <Typography component="span" variant="numeric">{Math.round(progress)}</Typography>%
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={progress} 
                          sx={{ 
                            height: 6, 
                            borderRadius: 3,
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: '#10b981',
                              borderRadius: 3,
                            },
                          }} 
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          <Typography component="span" variant="numeric">{formatCurrency(goal.currentAmount)}</Typography> of <Typography component="span" variant="numeric">{formatCurrency(goal.targetAmount)}</Typography>
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Grid>

              {/* Budget Status */}
              <Grid item xs={12} md={4}>
                <Box>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <BudgetIcon sx={{ fontSize: 18, color: '#6366f1' }} />
                    <Typography variant="body2" fontWeight={500}>Budget Status</Typography>
                  </Box>
                  {displayBudgets.slice(0, 2).map((budget) => {
                    const percentage = (budget.spent / budget.budget) * 100;
                    const isOverBudget = percentage > 100;
                    return (
                      <Box key={budget.category} sx={{ 
                        p: 2, 
                        mb: 1.5,
                        borderRadius: '12px',
                        background: `rgba(${isOverBudget ? '239, 68, 68' : '99, 102, 241'}, 0.05)`,
                        border: `1px solid rgba(${isOverBudget ? '239, 68, 68' : '99, 102, 241'}, 0.1)`,
                      }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="body2" fontWeight={500}>{budget.category}</Typography>
                          <Typography variant="caption" color={isOverBudget ? '#ef4444' : '#6366f1'}>
                            <Typography component="span" variant="numeric">{Math.round(percentage)}</Typography>%
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min(percentage, 100)} 
                          sx={{ 
                            height: 4, 
                            borderRadius: 2,
                            backgroundColor: `rgba(${isOverBudget ? '239, 68, 68' : '99, 102, 241'}, 0.1)`,
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: isOverBudget ? '#ef4444' : '#6366f1',
                              borderRadius: 2,
                            },
                          }} 
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          <Typography component="span" variant="numeric">{formatCurrency(budget.spent)}</Typography> of <Typography component="span" variant="numeric">{formatCurrency(budget.budget)}</Typography>
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default QuickActions;