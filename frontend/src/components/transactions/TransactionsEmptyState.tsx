import React from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Telegram as TelegramIcon,
  Upload as UploadIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';

interface TransactionsEmptyStateProps {
  onAddTransaction: () => void;
  onConnectTelegram?: () => void;
  isTelegramLinked?: boolean;
}

const TransactionsEmptyState: React.FC<TransactionsEmptyStateProps> = ({
  onAddTransaction,
  onConnectTelegram,
  isTelegramLinked = false,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
        textAlign: 'center',
        p: 4,
      }}
    >
      <TrendingIcon
        sx={{
          fontSize: 80,
          color: 'text.disabled',
          mb: 2,
        }}
      />

      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
        No Transactions Yet
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500 }}>
        Start tracking your finances by adding your first transaction.
        You can add it manually, via Telegram bot, or import from a file.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={onAddTransaction}
        >
          Add Transaction
        </Button>

        {!isTelegramLinked && onConnectTelegram && (
          <Button
            variant="outlined"
            size="large"
            startIcon={<TelegramIcon />}
            onClick={onConnectTelegram}
            sx={{ borderColor: '#0088cc', color: '#0088cc', '&:hover': { borderColor: '#006699', color: '#006699' } }}
          >
            Connect Telegram
          </Button>
        )}

        <Button
          variant="outlined"
          size="large"
          startIcon={<UploadIcon />}
          disabled
        >
          Import CSV
        </Button>
      </Stack>

      <Card variant="outlined" sx={{ mt: 4, maxWidth: 600 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
            Quick Tips
          </Typography>
          <Typography variant="body2" color="text.secondary" align="left">
            • Add transactions manually with the button above
            <br />
            • Connect Telegram to add expenses via chat, voice, or photos
            <br />
            • Each transaction is automatically categorized and can be edited
            <br />
            • Filter and search your transactions once you have some data
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TransactionsEmptyState;
