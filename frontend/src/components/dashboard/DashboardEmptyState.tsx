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
} from '@mui/material';
import {
  Telegram as TelegramIcon,
  Add as AddIcon,
  Mic as VoiceIcon,
  CameraAlt as PhotoIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

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
  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 4 }}>
      <Card elevation={0} sx={{ textAlign: 'center', p: 4, bgcolor: 'background.default' }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Welcome to Financy!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Let's get started by adding your first transaction
        </Typography>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          {/* Quick Add Transaction */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ flex: 1 }}>
                <EditIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Add Transaction Manually
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Click the button below to add your first income or expense manually through the web interface.
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={onAddTransaction}
                fullWidth
              >
                Add Transaction
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
                bgcolor: isTelegramLinked ? 'success.light' : 'background.paper',
              }}
            >
              <Box sx={{ flex: 1 }}>
                <TelegramIcon sx={{ fontSize: 48, color: '#0088cc', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {isTelegramLinked ? 'Use Telegram Bot' : 'Connect Telegram Bot'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {isTelegramLinked
                    ? 'Send messages, voice notes, or photos directly to the bot to track your finances.'
                    : 'Connect your Telegram account and track your finances on the go with just a message.'
                  }
                </Typography>
                {isTelegramLinked && (
                  <List dense>
                    <ListItem disablePadding sx={{ mb: 1 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <EditIcon fontSize="small" color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary={<Typography variant="caption">Text: "Spent $50 on groceries" or "Got paid $2k"</Typography>}
                      />
                    </ListItem>
                    <ListItem disablePadding sx={{ mb: 1 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <VoiceIcon fontSize="small" color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary={<Typography variant="caption">Voice: Record income or expenses</Typography>}
                      />
                    </ListItem>
                    <ListItem disablePadding>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <PhotoIcon fontSize="small" color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary={<Typography variant="caption">Photo: Send a receipt or invoice</Typography>}
                      />
                    </ListItem>
                  </List>
                )}
              </Box>
              <Button
                variant={isTelegramLinked ? 'outlined' : 'contained'}
                size="large"
                startIcon={<TelegramIcon />}
                onClick={onConnectTelegram}
                fullWidth
                sx={isTelegramLinked ? {} : { bgcolor: '#0088cc', '&:hover': { bgcolor: '#006699' } }}
              >
                {isTelegramLinked ? 'Open Telegram' : 'Connect Telegram'}
              </Button>
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, p: 3, bgcolor: 'primary.main', borderRadius: 2 }}>
          <Typography variant="body2" sx={{ color: 'white' }}>
            <strong>Tip:</strong> After adding some transactions, you'll see insights like income vs expense trends,
            category breakdowns, budget tracking, and cash flow projections right here on your dashboard.
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};

export default DashboardEmptyState;
