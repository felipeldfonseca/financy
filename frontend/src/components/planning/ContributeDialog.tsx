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
import { Goal, ContributeData } from '../../services/goalApi';
import { localTodayIso } from '../../utils/bills';

interface Props {
  goal: Goal | null;
  onClose: () => void;
  onConfirm: (data: ContributeData) => Promise<unknown>;
}

/** Records a deposit towards the goal — in the depositor's own name. */
export const ContributeDialog: React.FC<Props> = ({ goal, onClose, onConfirm }) => {
  const { t } = useTranslation('planning');

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(localTodayIso());
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!goal) return;
    setAmount('');
    setDate(localTodayIso());
    setError(null);
  }, [goal]);

  const submit = async () => {
    const parsed = parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError(t('goals.contribute.invalid'));
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onConfirm({ amount: parsed, date });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(goal)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('goals.contribute.title')}</DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" sx={{ mb: 2 }}>
          {goal?.name}
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              label={t('goals.contribute.amount')}
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
              label={t('goals.contribute.date')}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              fullWidth
              type="date"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          {t('goals.contribute.hint')}
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>
          {t('goals.contribute.cancel')}
        </Button>
        <Button onClick={submit} variant="contained" disabled={isSaving}>
          {t('goals.contribute.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
