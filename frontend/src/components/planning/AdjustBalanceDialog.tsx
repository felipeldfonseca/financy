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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Goal, AdjustBalanceData } from '../../services/goalApi';
import { localTodayIso } from '../../utils/bills';

interface Props {
  goal: Goal | null;
  onClose: () => void;
  onConfirm: (data: AdjustBalanceData) => Promise<unknown>;
}

/**
 * A ± correction of the goal balance — yield that landed, a loss, a recount.
 * It joins the trail marked "≈", apart from real deposits, and never touches
 * the month bar.
 */
export const AdjustBalanceDialog: React.FC<Props> = ({ goal, onClose, onConfirm }) => {
  const { t } = useTranslation('planning');

  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(localTodayIso());
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!goal) return;
    setDirection('up');
    setAmount('');
    setNote('');
    setDate(localTodayIso());
    setError(null);
  }, [goal]);

  const submit = async () => {
    const parsed = parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError(t('goals.adjust.invalid'));
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onConfirm({
        amount: direction === 'down' ? -parsed : parsed,
        note: note.trim() || undefined,
        date,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(goal)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('goals.adjust.title')}</DialogTitle>

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
          <Grid item xs={12}>
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              value={direction}
              onChange={(_event, value: 'up' | 'down' | null) => {
                if (value) setDirection(value);
              }}
              aria-label={t('goals.adjust.direction') as string}
            >
              <ToggleButton value="up" sx={{ textTransform: 'none', fontWeight: 600 }}>
                + {t('goals.adjust.increase')}
              </ToggleButton>
              <ToggleButton value="down" sx={{ textTransform: 'none', fontWeight: 600 }}>
                − {t('goals.adjust.decrease')}
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          <Grid item xs={6}>
            <TextField
              label={t('goals.adjust.amount')}
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
              label={t('goals.adjust.date')}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              fullWidth
              type="date"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label={t('goals.adjust.note')}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              fullWidth
              inputProps={{ maxLength: 300 }}
              placeholder={t('goals.adjust.notePlaceholder') as string}
            />
          </Grid>
        </Grid>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          {t('goals.adjust.hint')}
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>
          {t('goals.adjust.cancel')}
        </Button>
        <Button onClick={submit} variant="contained" disabled={isSaving}>
          {t('goals.adjust.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
