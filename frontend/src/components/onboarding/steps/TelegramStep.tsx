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
import { useAuth } from '../../../contexts/AuthContext';

const TelegramStep: React.FC = () => {
  const { state: { user } } = useAuth();
  const isLinked = !!user?.telegramUsername;
  const botUsername = process.env.REACT_APP_TELEGRAM_BOT_USERNAME || 'FinancyApp_bot';

  const handleOpenTelegram = () => {
    window.open(`https://t.me/${botUsername}`, '_blank');
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Connect Telegram Bot
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Track your finances on the go with just a message, voice note, or photo.
      </Typography>

      {isLinked ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Telegram Connected!
          </Typography>
          <Typography variant="caption">
            Connected as @{user.telegramUsername}
          </Typography>
        </Alert>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          Connect your Telegram account to start tracking your finances via chat
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TelegramIcon sx={{ fontSize: 40, color: '#0088cc', mr: 2 }} />
          <Box>
            <Typography variant="h6">@{botUsername}</Typography>
            <Chip label="Official Bot" size="small" color="primary" />
          </Box>
        </Box>

        <List dense>
          <ListItem>
            <ListItemIcon>
              <CheckIcon color="success" fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Send text messages"
              secondary="e.g., 'Spent $50 on groceries' or 'Got paid $2000 salary'"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckIcon color="success" fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Send voice messages"
              secondary="Just speak naturally about income or expenses"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckIcon color="success" fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Send receipt photos"
              secondary="AI will extract the amount and details"
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
          {isLinked ? 'Open Telegram Bot' : 'Connect Telegram Bot'}
        </Button>
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
        {isLinked
          ? 'You can disconnect or reconnect anytime in Settings'
          : 'You can skip this step and connect later in Settings'
        }
      </Typography>
    </Box>
  );
};

export default TelegramStep;
