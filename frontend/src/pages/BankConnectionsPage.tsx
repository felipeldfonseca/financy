import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Paper,
  Box,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  List,
  ListItem,
  ListItemText,
  Avatar,
} from '@mui/material';
import {
  AccountBalance as BankIcon,
  Add as AddIcon,
  Sync as SyncIcon,
  LinkOff as DisconnectIcon,
} from '@mui/icons-material';
import { PluggyConnect } from 'react-pluggy-connect';
import { useTranslation } from 'react-i18next';
import {
  openFinanceApi,
  BankConnection,
  ConnectionStatus,
} from '../services/openFinanceApi';

const statusColor: Record<ConnectionStatus, 'success' | 'warning' | 'error'> = {
  connected: 'success',
  updating: 'warning',
  login_error: 'error',
  consent_expired: 'error',
  error: 'error',
};

const BankConnectionsPage: React.FC = () => {
  const { t } = useTranslation('banks');
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<BankConnection | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    try {
      const data = await openFinanceApi.listConnections();
      setConnections(data);
    } catch (err: any) {
      setError(err.response?.data?.message || t('errors.load'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const handleStartConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      setSuccess(null);
      const { accessToken } = await openFinanceApi.createConnectToken();
      setConnectToken(accessToken);
    } catch (err: any) {
      const message =
        err.response?.status === 503
          ? t('errors.notConfigured')
          : err.response?.data?.message || t('errors.connectToken');
      setError(message);
      setIsConnecting(false);
    }
  };

  const handleWidgetSuccess = async (itemData: { item: { id: string } }) => {
    setConnectToken(null);
    setIsConnecting(false);
    try {
      await openFinanceApi.registerConnection(itemData.item.id);
      setSuccess(t('connectSuccess'));
      await loadConnections();
    } catch (err: any) {
      setError(err.response?.data?.message || t('errors.register'));
    }
  };

  const handleWidgetError = () => {
    setConnectToken(null);
    setIsConnecting(false);
    setError(t('errors.widget'));
  };

  const handleWidgetClose = () => {
    setConnectToken(null);
    setIsConnecting(false);
  };

  const handleSync = async (connection: BankConnection) => {
    try {
      setSyncingId(connection.id);
      setError(null);
      setSuccess(null);
      const result = await openFinanceApi.syncConnection(connection.id);
      setSuccess(
        t('syncSuccess', {
          imported: result.transactionsImported,
          skipped: result.transactionsSkipped,
        }),
      );
      await loadConnections();
    } catch (err: any) {
      setError(err.response?.data?.message || t('errors.sync'));
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectTarget) return;
    try {
      setIsDisconnecting(true);
      setError(null);
      await openFinanceApi.disconnect(disconnectTarget.id);
      setSuccess(t('disconnectSuccess'));
      setDisconnectTarget(null);
      await loadConnections();
    } catch (err: any) {
      setError(err.response?.data?.message || t('errors.disconnect'));
    } finally {
      setIsDisconnecting(false);
    }
  };

  const formatBalance = (balance: number | null, currency: string) => {
    if (balance === null || balance === undefined) return '—';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(
        Number(balance),
      );
    } catch {
      return `${balance} ${currency}`;
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        {t('title')}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {t('subtitle')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 3 }}>
        {t('consentInfo')}
      </Alert>

      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={isConnecting ? <CircularProgress size={18} color="inherit" /> : <AddIcon />}
          onClick={handleStartConnect}
          disabled={isConnecting}
        >
          {t('connectButton')}
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : connections.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <BankIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">
            {t('empty')}
          </Typography>
        </Paper>
      ) : (
        connections.map(connection => (
          <Paper key={connection.id} sx={{ p: 3, mb: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar src={connection.institutionImageUrl || undefined}>
                  <BankIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {connection.institutionName || t('unknownInstitution')}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Chip
                      label={t(`status.${connection.status}`)}
                      size="small"
                      color={statusColor[connection.status]}
                    />
                    {connection.lastSyncedAt && (
                      <Typography variant="caption" color="text.secondary">
                        {t('lastSynced', {
                          date: new Date(connection.lastSyncedAt).toLocaleString(),
                        })}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={
                    syncingId === connection.id ? (
                      <CircularProgress size={16} />
                    ) : (
                      <SyncIcon />
                    )
                  }
                  onClick={() => handleSync(connection)}
                  disabled={syncingId === connection.id}
                >
                  {t('syncButton')}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  startIcon={<DisconnectIcon />}
                  onClick={() => setDisconnectTarget(connection)}
                >
                  {t('disconnectButton')}
                </Button>
              </Box>
            </Box>

            {connection.accounts?.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <List dense disablePadding>
                  {connection.accounts.map(account => (
                    <ListItem key={account.id} disableGutters>
                      <ListItemText
                        primary={account.name || t(`accountTypes.${account.type}`)}
                        secondary={[
                          t(`accountTypes.${account.type}`),
                          account.maskedNumber,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatBalance(account.balance, account.currency)}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {connection.lastError && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {connection.lastError}
              </Alert>
            )}
          </Paper>
        ))
      )}

      {connectToken && (
        <PluggyConnect
          connectToken={connectToken}
          includeSandbox={process.env.NODE_ENV !== 'production'}
          onSuccess={handleWidgetSuccess}
          onError={handleWidgetError}
          onClose={handleWidgetClose}
        />
      )}

      <Dialog open={!!disconnectTarget} onClose={() => setDisconnectTarget(null)}>
        <DialogTitle>{t('disconnectDialog.title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('disconnectDialog.message', {
              institution: disconnectTarget?.institutionName || t('unknownInstitution'),
            })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisconnectTarget(null)} disabled={isDisconnecting}>
            {t('disconnectDialog.cancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            startIcon={isDisconnecting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {t('disconnectDialog.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BankConnectionsPage;
