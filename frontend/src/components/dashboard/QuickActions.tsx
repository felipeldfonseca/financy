import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Button,
} from '@mui/material';
import {
  EventNote as CalendarIcon,
  TrackChanges as GoalIcon,
  Savings as BudgetIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();


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
          <CardContent sx={{ pt: 3, px: 3, pb: 0 }}>
            
            <Grid container spacing={3}>
              {/* Upcoming Bills */}
              <Grid item xs={12} md={4}>
                <Box sx={{ height: 240, display: 'flex', flexDirection: 'column' }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <CalendarIcon sx={{ fontSize: 24, color: '#f59e0b' }} />
                    <Typography variant="h6" fontWeight={600}>Upcoming Bills</Typography>
                  </Box>
                  <Box sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 2,
                    borderRadius: '12px',
                    background: 'rgba(245, 158, 11, 0.03)',
                    border: '1px dashed rgba(245, 158, 11, 0.2)',
                  }}>
                    <CalendarIcon sx={{ fontSize: 40, color: 'rgba(245, 158, 11, 0.3)', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
                      Track recurring bills and never miss a payment
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => navigate('/planning')}
                      sx={{
                        borderColor: '#f59e0b',
                        color: '#f59e0b',
                        '&:hover': {
                          borderColor: '#d97706',
                          bgcolor: 'rgba(245, 158, 11, 0.05)',
                        },
                      }}
                    >
                      Add Bills
                    </Button>
                  </Box>
                </Box>
              </Grid>

              {/* Goals Progress */}
              <Grid item xs={12} md={4}>
                <Box sx={{ height: 240, display: 'flex', flexDirection: 'column' }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <GoalIcon sx={{ fontSize: 24, color: '#10b981' }} />
                    <Typography variant="h6" fontWeight={600}>Goal Progress</Typography>
                  </Box>
                  <Box sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 2,
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.03)',
                    border: '1px dashed rgba(16, 185, 129, 0.2)',
                  }}>
                    <GoalIcon sx={{ fontSize: 40, color: 'rgba(16, 185, 129, 0.3)', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
                      Set financial goals and track your progress
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => navigate('/planning')}
                      sx={{
                        borderColor: '#10b981',
                        color: '#10b981',
                        '&:hover': {
                          borderColor: '#059669',
                          bgcolor: 'rgba(16, 185, 129, 0.05)',
                        },
                      }}
                    >
                      Add Goals
                    </Button>
                  </Box>
                </Box>
              </Grid>

              {/* Budget Status */}
              <Grid item xs={12} md={4}>
                <Box sx={{ height: 240, display: 'flex', flexDirection: 'column' }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <BudgetIcon sx={{ fontSize: 24, color: '#6366f1' }} />
                    <Typography variant="h6" fontWeight={600}>Budget Status</Typography>
                  </Box>
                  <Box sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 2,
                    borderRadius: '12px',
                    background: 'rgba(99, 102, 241, 0.03)',
                    border: '1px dashed rgba(99, 102, 241, 0.2)',
                  }}>
                    <BudgetIcon sx={{ fontSize: 40, color: 'rgba(99, 102, 241, 0.3)', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
                      Create budgets by category to control spending
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => navigate('/planning')}
                      sx={{
                        borderColor: '#6366f1',
                        color: '#6366f1',
                        '&:hover': {
                          borderColor: '#4f46e5',
                          bgcolor: 'rgba(99, 102, 241, 0.05)',
                        },
                      }}
                    >
                      Add Budgets
                    </Button>
                  </Box>
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