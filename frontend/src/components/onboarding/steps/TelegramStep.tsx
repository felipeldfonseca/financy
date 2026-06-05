import React from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Alert,
  Chip,
} from '@mui/material';
import {
  Telegram as TelegramIcon,
  CheckCircle as CheckIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';

const TelegramStep: React.FC = () => {
  const { t } = useTranslation('onboarding');
  const { state: { user } } = useAuth();
  const isLinked = !!user?.isTelegramLinked;
  const botUsername = process.env.REACT_APP_TELEGRAM_BOT_USERNAME || 'Financy_Official_Bot';

  const handleOpenTelegram = () => {
    window.open(`https://t.me/${botUsername}`, '_blank');
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('telegram.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('telegram.subtitle')}
      </Typography>

      {isLinked ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {t('telegram.connected')}
          </Typography>
          {user?.telegramUsername && (
            <Typography variant="caption">
              {t('telegram.connectedAs', { username: user.telegramUsername })}
            </Typography>
          )}
        </Alert>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          {t('telegram.connectInfo')}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TelegramIcon sx={{ fontSize: 40, color: '#0088cc', mr: 2 }} />
          <Box>
            <Typography variant="h6">@{botUsername}</Typography>
            <Chip label={t('telegram.officialBot')} size="small" color="primary" />
          </Box>
        </Box>

        <List dense>
          <ListItem>
            <ListItemIcon>
              <CheckIcon color="success" fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={t('telegram.features.textMessages.title')}
              secondary={t('telegram.features.textMessages.subtitle')}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckIcon color="success" fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={t('telegram.features.voiceMessages.title')}
              secondary={t('telegram.features.voiceMessages.subtitle')}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckIcon color="success" fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={t('telegram.features.receiptPhotos.title')}
              secondary={t('telegram.features.receiptPhotos.subtitle')}
            />
          </ListItem>
        </List>

        <Button
          variant="contained"
          fullWidth
          startIcon={<TelegramIcon />}
          endIcon={<ArrowIcon />}
          onClick={handleOpenTelegram}
          sx={{
            mt: 2,
            bgcolor: '#0088cc',
            '&:hover': { bgcolor: '#006699' },
          }}
        >
          {isLinked ? t('telegram.openBot') : t('telegram.connectBot')}
        </Button>
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
        {isLinked
          ? t('telegram.helpText.connected')
          : t('telegram.helpText.notConnected')
        }
      </Typography>
    </Box>
  );
};

export default TelegramStep;
