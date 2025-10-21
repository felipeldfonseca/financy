import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Alert,
  LinearProgress,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Person as PersonIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SummaryCards from '../components/dashboard/SummaryCards';
import ChartSection from '../components/dashboard/ChartSection';
import QuickActions from '../components/dashboard/QuickActions';
import ContextSwitcher from '../components/dashboard/ContextSwitcher';
import ExpandableAddButton from '../components/common/ExpandableAddButton';

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

interface Group {
  id: string;
  name: string;
  memberCount: number;
  type: 'family' | 'friends' | 'business' | 'shared';
  color: string;
}

const DashboardPage: React.FC = () => {
  const { state, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [contextType, setContextType] = useState<'personal' | 'groups'>('personal');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

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
    if (contextType === 'groups' && selectedGroup) {
      console.log(`Add transaction clicked for group: ${selectedGroup.name}`);
    } else {
      console.log('Add personal transaction clicked');
    }
  };

  const handleContextTypeChange = (type: 'personal' | 'groups') => {
    setContextType(type);
    if (type === 'personal') {
      setSelectedGroup(null);
    }
    // Here you would typically reload data based on the context
    console.log(`Context changed to: ${type}`);
  };

  const handleGroupSelect = (group: Group) => {
    setSelectedGroup(group);
    // Here you would typically reload data for the selected group
    console.log(`Group selected: ${group.name}`);
  };


  // Determine if it's user's first visit (within 24 hours of registration)
  const isFirstVisit = () => {
    if (!state.user?.createdAt) return false;
    const createdAt = new Date(state.user.createdAt);
    const now = new Date();
    const hoursSinceRegistration = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceRegistration <= 24;
  };

  const getWelcomeMessage = () => {
    if (!state.user?.firstName) return 'Welcome back!';
    const capitalizedFirstName = state.user.firstName.charAt(0).toUpperCase() + state.user.firstName.slice(1).toLowerCase();
    return isFirstVisit() 
      ? `Welcome, ${capitalizedFirstName}!`
      : `Hello, ${capitalizedFirstName}!`;
  };

  const getUserInitial = () => {
    return state.user?.firstName?.charAt(0).toUpperCase() || '?';
  };

  const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    handleMenuClose();
    navigate('/settings'); // Navigate to profile/settings page
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    navigate('/');
  };

  return (
    <Box sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography 
            variant="brand" 
            component="h1" 
            gutterBottom
            sx={{ 
              color: 'text.primary',
              fontSize: '2.5rem',
            }}
          >
            {getWelcomeMessage()}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Here's your financial overview.
          </Typography>
        </Box>
        
        {/* Action Buttons and User Avatar */}
        {state.user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <ExpandableAddButton
              onAddTransaction={handleAddTransaction}
              contextType={contextType}
              selectedGroupName={selectedGroup?.name}
            />
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: 'primary.main',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              }}
              onClick={handleAvatarClick}
            >
              {getUserInitial()}
            </Avatar>
            
            {/* User Menu Dropdown */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              onClick={handleMenuClose}
              PaperProps={{
                elevation: 3,
                sx: {
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                  mt: 1.5,
                  minWidth: 180,
                  '&:before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    right: 14,
                    width: 10,
                    height: 10,
                    bgcolor: 'background.paper',
                    transform: 'translateY(-50%) rotate(45deg)',
                    zIndex: 0,
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={handleProfileClick}>
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>My profile</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Log out</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        )}
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

      {/* Context Switcher */}
      <Box sx={{ mb: 4 }}>
        <ContextSwitcher
          contextType={contextType}
          selectedGroup={selectedGroup}
          onContextTypeChange={handleContextTypeChange}
          onGroupSelect={handleGroupSelect}
        />
      </Box>

      {/* Summary Cards */}
      <Box sx={{ mb: 4 }}>
        <SummaryCards data={data?.summary} isLoading={isLoading} />
      </Box>


      {/* Smart Insights */}
      <Box sx={{ mb: 4 }}>
        <QuickActions
          contextType={contextType}
          selectedGroupName={selectedGroup?.name}
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
    </Box>
  );
};

export default DashboardPage;