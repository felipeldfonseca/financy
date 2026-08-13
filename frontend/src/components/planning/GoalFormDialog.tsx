import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Goal, GoalType, CreateGoalData } from '../../services/goalApi';
import { annualEquivalentPercent } from '../../utils/projections';

const CURRENCIES = ['BRL', 'USD', 'EUR', 'GBP', 'JPY', 'CNY'];
const PALETTE = ['#10b981', '#1976d2', '#7b1fa2', '#ef6c00', '#c2185b', '#455a64'];

interface Props {
  open: boolean;
  goal?: Goal | null;
  defaultCurrency: string;
  onClose: () => void;
  onSubmit: (data: CreateGoalData) => Promise<unknown>;
}

export const GoalFormDialog: React.FC<Props> = ({
  open,
  goal,
  defaultCurrency,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation('planning');
  const isEdit = Boolean(goal);

  const [values, setValues] = useState({
    name: '',
    goalType: 'target' as GoalType,
    targetAmount: '',
    monthlyTarget: '',
    growthRate: '',
    currency: defaultCurrency,
    targetDate: '',
    color: PALETTE[0],
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setValues({
      name: goal?.name ?? '',
      goalType: goal?.goalType ?? 'target',
      targetAmount: goal?.targetAmount != null ? String(goal.targetAmount) : '',
      monthlyTarget: goal?.monthlyTarget != null ? String(goal.monthlyTarget) : '',
      growthRate:
        goal?.expectedMonthlyGrowthRate != null ? String(goal.expectedMonthlyGrowthRate) : '',
      currency: goal?.currency ?? defaultCurrency,
      targetDate: goal?.targetDate?.slice(0, 10) ?? '',
      color: goal?.color ?? PALETTE[0],
    });
  }, [open, goal, defaultCurrency]);

  const change = (field: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  const isHabit = values.goalType === 'recurring';

  const submit = async () => {
    const targetAmount = values.targetAmount === '' ? undefined : parseFloat(values.targetAmount);
    const monthlyTarget = values.monthlyTarget === '' ? undefined : parseFloat(values.monthlyTarget);
    const growthRate = values.growthRate === '' ? undefined : parseFloat(values.growthRate);

    if (!values.name.trim()) {
      setError(t('goals.form.nameRequired'));
      return;
    }
    if (growthRate != null && (!Number.isFinite(growthRate) || growthRate < 0 || growthRate > 50)) {
      setError(t('goals.form.growthRateInvalid'));
      return;
    }
    if (isHabit) {
      if (monthlyTarget == null || !Number.isFinite(monthlyTarget) || monthlyTarget <= 0) {
        setError(t('goals.form.monthlyTargetInvalid'));
        return;
      }
      // The finish line is optional for a habit, but nonsense is still nonsense.
      if (targetAmount != null && (!Number.isFinite(targetAmount) || targetAmount <= 0)) {
        setError(t('goals.form.targetInvalid'));
        return;
      }
    } else if (targetAmount == null || !Number.isFinite(targetAmount) || targetAmount <= 0) {
      setError(t('goals.form.targetInvalid'));
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: values.name.trim(),
        goalType: values.goalType,
        targetAmount,
        monthlyTarget: isHabit ? monthlyTarget : undefined,
        // 0 clears the rate for projections — same as never having set one.
        expectedMonthlyGrowthRate: growthRate,
        currency: values.currency,
        targetDate: !isHabit && values.targetDate ? values.targetDate : undefined,
        color: values.color,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? t('goals.form.editTitle') : t('goals.form.addTitle')}</DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12}>
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={values.goalType}
              onChange={(_event, goalType: GoalType | null) => {
                if (goalType) setValues((current) => ({ ...current, goalType }));
              }}
              aria-label={t('goals.form.type') as string}
            >
              <ToggleButton value="target" sx={{ textTransform: 'none', fontWeight: 600 }}>
                🎯 {t('goals.form.typeTarget')}
              </ToggleButton>
              <ToggleButton value="recurring" sx={{ textTransform: 'none', fontWeight: 600 }}>
                🔁 {t('goals.form.typeRecurring')}
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label={t('goals.form.name')}
              value={values.name}
              onChange={change('name')}
              fullWidth
              autoFocus
              inputProps={{ maxLength: 200 }}
            />
          </Grid>

          <Grid item xs={7} sm={8}>
            <TextField
              label={isHabit ? t('goals.form.monthlyTarget') : t('goals.form.target')}
              value={isHabit ? values.monthlyTarget : values.targetAmount}
              onChange={change(isHabit ? 'monthlyTarget' : 'targetAmount')}
              fullWidth
              type="number"
              inputProps={{ min: 0.01, step: 0.01 }}
            />
          </Grid>

          <Grid item xs={5} sm={4}>
            <TextField
              select
              label={t('goals.form.currency')}
              value={values.currency}
              onChange={change('currency')}
              fullWidth
            >
              {CURRENCIES.map((currency) => (
                <MenuItem key={currency} value={currency}>
                  {currency}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {isHabit ? (
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('goals.form.optionalTarget')}
                value={values.targetAmount}
                onChange={change('targetAmount')}
                fullWidth
                type="number"
                inputProps={{ min: 0.01, step: 0.01 }}
                helperText={t('goals.form.optionalTargetHint')}
              />
            </Grid>
          ) : (
            <Grid item xs={12} sm={6}>
              <TextField
                label={t('goals.form.targetDate')}
                value={values.targetDate}
                onChange={change('targetDate')}
                fullWidth
                type="date"
                InputLabelProps={{ shrink: true }}
                helperText={t('goals.form.targetDateHint')}
              />
            </Grid>
          )}

          <Grid item xs={12} sm={6}>
            <TextField
              label={t('goals.form.growthRate')}
              value={values.growthRate}
              onChange={change('growthRate')}
              fullWidth
              type="number"
              inputProps={{ min: 0, max: 50, step: 0.1 }}
              helperText={
                parseFloat(values.growthRate) > 0
                  ? t('goals.form.growthRateEquivalent', {
                      annual: annualEquivalentPercent(parseFloat(values.growthRate)).toLocaleString(
                        undefined,
                        { maximumFractionDigits: 1 },
                      ),
                    })
                  : t('goals.form.growthRateHint')
              }
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {PALETTE.map((color) => (
                <Box
                  key={color}
                  role="button"
                  aria-label={color}
                  onClick={() => setValues((current) => ({ ...current, color }))}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: color,
                    cursor: 'pointer',
                    border:
                      values.color === color ? '3px solid rgba(0,0,0,0.45)' : '3px solid transparent',
                    transition: 'transform 0.2s ease',
                    '&:hover': { transform: 'scale(1.1)' },
                  }}
                />
              ))}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>
          {t('goals.form.cancel')}
        </Button>
        <Button onClick={submit} variant="contained" disabled={isSaving}>
          {t('goals.form.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
