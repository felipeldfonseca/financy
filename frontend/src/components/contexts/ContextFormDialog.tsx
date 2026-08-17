import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  ContextType,
  CreateContextData,
  FinancialContext,
} from '../../services/contextApi';

const CONTEXT_TYPES: ContextType[] = [
  'family',
  'shared_living',
  'trip',
  'project',
  'friends',
  'business',
  'shared',
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'BRL', 'JPY', 'CNY'];

const PALETTE = ['#1976d2', '#7b1fa2', '#00897b', '#ef6c00', '#c2185b', '#455a64'];

interface Props {
  open: boolean;
  context?: FinancialContext | null;
  onClose: () => void;
  onSubmit: (data: CreateContextData) => Promise<unknown>;
}

export const ContextFormDialog: React.FC<Props> = ({ open, context, onClose, onSubmit }) => {
  const { t } = useTranslation('contexts');
  const isEdit = Boolean(context);

  const [values, setValues] = useState<CreateContextData>({
    name: '',
    description: '',
    type: 'family',
    defaultCurrency: 'BRL',
    color: PALETTE[0],
  });
  const [includePersonal, setIncludePersonal] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setError(null);
    setValues({
      name: context?.name ?? '',
      description: context?.description ?? '',
      type: context?.type ?? 'family',
      defaultCurrency: context?.defaultCurrency ?? 'BRL',
      color: context?.color ?? PALETTE[0],
    });
    setIncludePersonal(context?.settings?.includeInPersonalFinances !== false);
  }, [open, context]);

  const change = (field: keyof CreateContextData) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  const submit = async () => {
    if (!values.name.trim()) {
      setError(t('form.nameRequired'));
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Merged over the existing settings so the budget (and future keys)
      // survive the toggle; "on" removes the key — absence means the default.
      const settings = { ...(context?.settings ?? {}) };
      if (includePersonal) {
        delete settings.includeInPersonalFinances;
      } else {
        settings.includeInPersonalFinances = false;
      }

      await onSubmit({ ...values, name: values.name.trim(), settings });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? t('form.editTitle') : t('form.createTitle')}</DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12}>
            <TextField
              label={t('form.name')}
              value={values.name}
              onChange={change('name')}
              fullWidth
              autoFocus
              inputProps={{ maxLength: 100 }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label={t('form.description')}
              value={values.description}
              onChange={change('description')}
              fullWidth
              multiline
              rows={2}
              inputProps={{ maxLength: 500 }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField select label={t('form.type')} value={values.type} onChange={change('type')} fullWidth>
              {CONTEXT_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {t(`types.${type}`)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              label={t('form.currency')}
              value={values.defaultCurrency}
              onChange={change('defaultCurrency')}
              fullWidth
            >
              {CURRENCIES.map((currency) => (
                <MenuItem key={currency} value={currency}>
                  {currency}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={includePersonal}
                  onChange={(event) => setIncludePersonal(event.target.checked)}
                />
              }
              label={t('form.includePersonal')}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 0.5 }}>
              {t('form.includePersonalHint')}
            </Typography>
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
                    border: values.color === color ? '3px solid rgba(0,0,0,0.45)' : '3px solid transparent',
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
          {t('actions.cancel')}
        </Button>
        <Button onClick={submit} variant="contained" disabled={isSaving}>
          {isEdit ? t('actions.save') : t('actions.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
