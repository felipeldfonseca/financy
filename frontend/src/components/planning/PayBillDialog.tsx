import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Bill, PayBillData } from '../../services/billApi';
import { localTodayIso } from '../../utils/bills';

interface Props {
  bill: Bill | null;
  onClose: () => void;
  onConfirm: (data: PayBillData) => Promise<unknown>;
}

/**
 * Confirms a settlement. The amount starts at what was billed but stays
 * editable — a bill paid late usually carries a fee, and the expense should
 * record what actually left the account.
 */
export const PayBillDialog: React.FC<Props> = ({ bill, onClose, onConfirm }) => {
  const { t } = useTranslation('planning');

  const [amount, setAmount] = useState('');
  const [paidDate, setPaidDate] = useState(localTodayIso());
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!bill) return;
    setAmount(String(bill.amount));
    setPaidDate(localTodayIso());
    setError(null);
  }, [bill]);

  const submit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(t('bills.form.amountInvalid'));
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onConfirm({ amount: parsedAmount, paidDate });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(bill)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('bills.payDialog.title')}</DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" sx={{ mb: 2 }}>
          {bill?.description}
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              label={t('bills.payDialog.amount')}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              fullWidth
              autoFocus
              type="number"
              inputProps={{ min: 0.01, step: 0.01 }}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              label={t('bills.payDialog.date')}
              value={paidDate}
              onChange={(event) => setPaidDate(event.target.value)}
              fullWidth
              type="date"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          {t('bills.payDialog.hint')}
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>
          {t('bills.payDialog.cancel')}
        </Button>
        <Button onClick={submit} variant="contained" disabled={isSaving}>
          {t('bills.payDialog.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
