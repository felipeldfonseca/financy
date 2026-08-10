import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ContextsProvider } from './contexts/ContextsContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicRoute } from './components/auth/PublicRoute';
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import ContextsPage from './pages/ContextsPage';
import InvitationPage from './pages/InvitationPage';
import PlanningPage from './pages/PlanningPage';
import SettingsPage from './pages/SettingsPage';
import TelegramSettingsPage from './pages/TelegramSettingsPage';
import './i18n'; // Initialize i18n

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ContextsProvider>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Routes>
          {/* Public routes */}
          <Route
            path="/"
            element={
              <PublicRoute>
                <LandingPage />
              </PublicRoute>
            }
          />
          <Route
            path="/welcome"
            element={
              <PublicRoute>
                <HomePage />
              </PublicRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          
          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <Layout>
                  <TransactionsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contexts"
            element={
              <ProtectedRoute>
                <Layout>
                  <ContextsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/planning"
            element={
              <ProtectedRoute>
                <Layout>
                  <PlanningPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <SettingsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/telegram"
            element={
              <ProtectedRoute>
                <Layout>
                  <TelegramSettingsPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/invitations/:token"
            element={
              <ProtectedRoute>
                <Layout>
                  <InvitationPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Fallback routes */}
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>
        </ContextsProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;