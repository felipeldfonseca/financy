import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import ContextsPage from './pages/ContextsPage';
import SettingsPage from './pages/SettingsPage';
import { useAuthStore } from './stores/authStore';

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Routes>
        {!isAuthenticated ? (
          <>
            <Route path='/' element={<HomePage />} />
            <Route path='/login' element={<LoginPage />} />
            <Route path='/register' element={<RegisterPage />} />
            <Route path='*' element={<HomePage />} />
          </>
        ) : (
          <Route path='/' element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path='dashboard' element={<DashboardPage />} />
            <Route path='transactions' element={<TransactionsPage />} />
            <Route path='contexts' element={<ContextsPage />} />
            <Route path='settings' element={<SettingsPage />} />
          </Route>
        )}
      </Routes>
    </Box>
  );
}

export default App;