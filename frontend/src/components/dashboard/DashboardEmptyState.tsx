import React from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  Telegram as TelegramIcon,
  Add as AddIcon,
  Mic as VoiceIcon,
  CameraAlt as PhotoIcon,
  Edit as EditIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface DashboardEmptyStateProps {
  onAddTransaction: () => void;
  onConnectTelegram: () => void;
  isTelegramLinked: boolean;
}

const DashboardEmptyState: React.FC<DashboardEmptyStateProps> = ({
  onAddTransaction,
  onConnectTelegram,
  isTelegramLinked,
}) => {
  const { t } = useTranslation('dashboard');
  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 4 }}>
      <Card elevation={0} sx={{ textAlign: 'center', p: 4, bgcolor: 'background.default' }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          {t('emptyState.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {t('emptyState.subtitle')}
        </Typography>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          {/* Quick Add Transaction */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ flex: 1 }}>
                <EditIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {t('emptyState.addManually.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('emptyState.addManually.description')}
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={onAddTransaction}
                fullWidth
              >
                {t('emptyState.addManually.button')}
              </Button>
            </Paper>
          </Grid>

          {/* Telegram Bot */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: isTelegramLinked ? '#e8f5e9' : 'background.paper',
                position: 'relative',
              }}
            >
              {isTelegramLinked && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                  }}
                >
                  <Chip
                    label={t('emptyState.telegram.connected')}
                    size="small"
                    sx={{
                      bgcolor: 'success.main',
                      color: 'white',
                    }}
                  />
                </Box>
              )}
              <Box sx={{ flex: 1 }}>
                <TelegramIcon sx={{ fontSize: 48, color: '#0088cc', mb: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ color: 'text.primary' }}>
                  {isTelegramLinked ? t('emptyState.telegram.titleConnected') : t('emptyState.telegram.title')}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, color: 'text.primary' }}>
                  {isTelegramLinked
                    ? t('emptyState.telegram.descriptionConnected')
                    : t('emptyState.telegram.description')
                  }
                </Typography>
                {isTelegramLinked && (
                  <List dense>
                    <ListItem disablePadding sx={{ mb: 1 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <EditIcon fontSize="small" sx={{ color: 'text.primary' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={<Typography variant="caption" sx={{ color: 'text.primary' }}>{t('emptyState.telegram.features.text')}</Typography>}
                      />
                    </ListItem>
                    <ListItem disablePadding sx={{ mb: 1 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <VoiceIcon fontSize="small" sx={{ color: 'text.primary' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={<Typography variant="caption" sx={{ color: 'text.primary' }}>{t('emptyState.telegram.features.voice')}</Typography>}
                      />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <PhotoIcon fontSize="small" sx={{ color: 'text.primary' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={<Typography variant="caption" sx={{ color: 'text.primary' }}>{t('emptyState.telegram.features.photo')}</Typography>}
                      />
                    </ListItem>
                  </List>
                )}
              </Box>
              <Button
                variant="contained"
                size="large"
                startIcon={<TelegramIcon sx={{ color: isTelegramLinked ? 'white' : 'white' }} />}
                onClick={onConnectTelegram}
                fullWidth
                sx={isTelegramLinked
                  ? { bgcolor: 'success.main', color: 'white', '&:hover': { bgcolor: 'success.dark' } }
                  : { bgcolor: '#0088cc', '&:hover': { bgcolor: '#006699' } }
                }
              >
                {isTelegramLinked ? t('emptyState.telegram.buttonConnected') : t('emptyState.telegram.button')}
              </Button>
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, p: 3, bgcolor: 'primary.main', borderRadius: 2 }}>
          <Typography variant="body2" sx={{ color: 'white' }}>
            {t('emptyState.tip')}
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};

export default DashboardEmptyState;
