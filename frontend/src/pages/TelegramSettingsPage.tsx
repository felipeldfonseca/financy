import React, { useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  Box,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Grid,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  LinkOff as UnlinkIcon,
  Refresh as RefreshIcon,
  Telegram as TelegramIcon,
  QrCode as QrCodeIcon,
  Edit as TextIcon,
  Mic as VoiceIcon,
  CameraAlt as PhotoIcon,
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/authApi';

const TelegramSettingsPage: React.FC = () => {
  const { state: authState, refreshAuth } = useAuth();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [, setTick] = useState(0); // Force re-render for timer updates

  const botUsername = process.env.REACT_APP_TELEGRAM_BOT_USERNAME || 'FinancyApp_bot';
  const isLinked = !!authState.user?.telegramUsername;

  const handleGenerateToken = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const result = await authApi.generateTelegramLinkToken();
      setLinkToken(result.token);
      setTokenExpiresAt(result.expiresAt);
      setSuccess('Link token generated successfully!');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || 'Failed to generate link token. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToken = () => {
    if (linkToken) {
      navigator.clipboard.writeText(linkToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyCommand = () => {
    if (linkToken) {
      navigator.clipboard.writeText(`/link ${linkToken}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUnlinkTelegram = async () => {
    try {
      setIsUnlinking(true);
      setError(null);

      await authApi.unlinkTelegram();
      await refreshAuth();

      setSuccess('Telegram account unlinked successfully!');
      setShowUnlinkDialog(false);
      setLinkToken(null);
      setTokenExpiresAt(null);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || 'Failed to unlink Telegram. Please try again.';
      setError(errorMessage);
    } finally {
      setIsUnlinking(false);
    }
  };

  const handleOpenTelegram = () => {
    if (linkToken) {
      // Deep link that opens Telegram and automatically starts the bot with the token
      window.open(`https://t.me/${botUsername}?start=${linkToken}`, '_blank');
    } else {
      window.open(`https://t.me/${botUsername}`, '_blank');
    }
  };

  const getTimeRemaining = () => {
    if (!tokenExpiresAt) return null;

    const now = new Date().getTime();
    const expires = new Date(tokenExpiresAt).getTime();
    const remaining = expires - now;

    if (remaining <= 0) return 'Expired';

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    return `${minutes}m ${seconds}s`;
  };

  // Auto-refresh time remaining
  useEffect(() => {
    if (tokenExpiresAt) {
      const interval = setInterval(() => {
        setTick(tick => tick + 1); // Force re-render every second
        const remaining = getTimeRemaining();
        if (remaining === 'Expired') {
          setLinkToken(null);
          setTokenExpiresAt(null);
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [tokenExpiresAt]);

  // Auto-refresh auth state when user returns to page (to check if linking was successful)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && linkToken) {
        // User returned to page, check if linking was successful
        refreshAuth();
      }
    };

    const handleFocus = () => {
      if (linkToken) {
        // User returned to page, check if linking was successful
        refreshAuth();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [linkToken, refreshAuth]);

  // Check for linking success when page loads
  useEffect(() => {
    if (linkToken && !isLinked) {
      // Poll for link status every 2 seconds if token is active
      const pollInterval = setInterval(async () => {
        await refreshAuth();
        // If user is now linked, clear the token and stop polling
        if (authState.user?.telegramUsername) {
          setLinkToken(null);
          setTokenExpiresAt(null);
          setSuccess('Telegram account linked successfully!');
          clearInterval(pollInterval);
        }
      }, 2000);

      return () => clearInterval(pollInterval);
    }
  }, [linkToken, isLinked, refreshAuth, authState.user?.telegramUsername]);

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Telegram Integration
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Link your Telegram account to track finances on the go with voice messages, text, and photos.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Connection Status */}
        <Grid item xs={12} md={isLinked ? 12 : 6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Connection Status
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <TelegramIcon sx={{ fontSize: 48, color: '#0088cc' }} />
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  @{botUsername}
                </Typography>
                <Chip
                  label={isLinked ? 'Connected' : 'Not Connected'}
                  size="small"
                  sx={isLinked
                    ? { bgcolor: 'success.main', color: 'white' }
                    : { bgcolor: 'grey.300', color: 'text.secondary' }
                  }
                />
              </Box>
            </Box>

            {isLinked && (
              <>
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Connected as @{authState.user?.telegramUsername}
                  </Typography>
                </Alert>

                <Button
                  variant="contained"
                  startIcon={<UnlinkIcon sx={{ color: 'white' }} />}
                  onClick={() => setShowUnlinkDialog(true)}
                  fullWidth
                  sx={{
                    bgcolor: '#e57373',
                    color: 'white',
                    '&:hover': { bgcolor: '#ef5350' },
                  }}
                >
                  Unlink Telegram Account
                </Button>
              </>
            )}

            {!isLinked && (
              <Alert severity="info">
                <Typography variant="body2">
                  Your Telegram account is not linked yet. Follow the instructions to connect.
                </Typography>
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Linking Instructions */}
        {!isLinked && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                How to Connect
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Stepper orientation="vertical">
                <Step active>
                  <StepLabel>Generate Link Token</StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Click the button below to generate a secure link token (valid for 15 minutes).
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={handleGenerateToken}
                      disabled={isLoading || !!linkToken}
                      startIcon={isLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
                    >
                      {linkToken ? 'Token Generated' : 'Generate Token'}
                    </Button>
                  </StepContent>
                </Step>

                <Step active={!!linkToken}>
                  <StepLabel>Open Telegram Bot</StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Scan the QR code with your phone or click the button to open Telegram.
                    </Typography>

                    {linkToken && (
                      <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                        mb: 2,
                        p: 2,
                        bgcolor: 'grey.50',
                        borderRadius: 2
                      }}>
                        <QRCodeSVG
                          value={`https://t.me/${botUsername}?start=${linkToken}`}
                          size={180}
                          level="H"
                          includeMargin
                        />
                        <Chip
                          icon={<QrCodeIcon />}
                          label={`Expires in: ${getTimeRemaining()}`}
                          color="primary"
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                    )}

                    <Button
                      variant="contained"
                      onClick={handleOpenTelegram}
                      disabled={!linkToken}
                      startIcon={<TelegramIcon />}
                      sx={{ bgcolor: '#0088cc', '&:hover': { bgcolor: '#006699' } }}
                      fullWidth
                    >
                      Open Telegram Bot
                    </Button>
                  </StepContent>
                </Step>

                <Step active={!!linkToken}>
                  <StepLabel>Complete Linking</StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="text.secondary">
                      The bot will automatically link your account. The page will update automatically once linking is complete.
                    </Typography>
                  </StepContent>
                </Step>
              </Stepper>
            </Paper>
          </Grid>
        )}

        {/* What You Can Do */}
        {isLinked && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, bgcolor: 'primary.main', color: 'white' }}>
              <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
                What You Can Do with Telegram
              </Typography>
              <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.2)' }} />

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <TextIcon sx={{ color: 'white', fontSize: 20 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'white' }}>
                      Send Text Messages
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                    "Spent $50 on groceries" or "Got paid $2000 salary"
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <VoiceIcon sx={{ color: 'white', fontSize: 20 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'white' }}>
                      Send Voice Messages
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                    Just speak naturally about your income or expenses
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PhotoIcon sx={{ color: 'white', fontSize: 20 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'white' }}>
                      Send Receipt Photos
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                    AI will extract the amount and details automatically
                  </Typography>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={handleOpenTelegram}
                  startIcon={<TelegramIcon sx={{ color: 'white' }} />}
                  sx={{
                    color: 'white',
                    borderColor: 'white',
                    '&:hover': { borderColor: 'rgba(255,255,255,0.8)', bgcolor: 'rgba(255,255,255,0.1)' },
                  }}
                >
                  Open Telegram Bot
                </Button>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Unlink Confirmation Dialog */}
      <Dialog open={showUnlinkDialog} onClose={() => setShowUnlinkDialog(false)}>
        <DialogTitle>Unlink Telegram Account?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to unlink your Telegram account (@{authState.user?.telegramUsername})?
            <br /><br />
            You will no longer be able to track transactions via Telegram until you link again.
            Your existing transactions will not be affected.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUnlinkDialog(false)}>Cancel</Button>
          <Button
            onClick={handleUnlinkTelegram}
            color="error"
            disabled={isUnlinking}
            startIcon={isUnlinking ? <CircularProgress size={20} /> : <UnlinkIcon />}
          >
            Unlink
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TelegramSettingsPage;
