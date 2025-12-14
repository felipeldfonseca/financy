import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Paper,
  Box,
  Tabs,
  Tab,
  Link,
} from '@mui/material';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const { t } = useTranslation('auth');
  const [tab, setTab] = useState(0);
  const navigate = useNavigate();
  const { clearError } = useAuth();

  const handleAuthSuccess = () => {
    navigate('/dashboard');
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
    clearError(); // Clear any existing error when switching tabs
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tab} onChange={handleTabChange} centered>
            <Tab label={t('tabs.login')} />
            <Tab label={t('tabs.register')} />
          </Tabs>
        </Box>

        {tab === 0 ? (
          <LoginForm onSuccess={handleAuthSuccess} />
        ) : (
          <RegisterForm onSuccess={handleAuthSuccess} />
        )}

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Link component={RouterLink} to="/" variant="body2">
            ← Back to Home
          </Link>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage;