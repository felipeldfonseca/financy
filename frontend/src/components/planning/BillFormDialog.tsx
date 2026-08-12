import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Bill, CreateBillData } from '../../services/billApi';
import { getDashboardCategoriesForType } from '../../utils/categoryMapping';
import { localTodayIso } from '../../utils/bills';

const CURRENCIES = ['BRL', 'USD', 'EUR', 'GBP', 'JPY', 'CNY'];

// 'other' reads best at the end of the list, where users expect the fallback.
const EXPENSE_CATEGORIES = [
  ...getDashboardCategoriesForType('expense').filter((category) => category !== 'other'),
  'other',
];

interface Props {
  open: boolean;
  bill?: Bill | null;
  defaultCurrency: string;
  onClose: () => void;
  onSubmit: (data: CreateBillData) => Promise<unknown>;
}

interface FormValues {
  description: string;
  amount: string;
  currency: string;
  dueDate: string;
  dashboardCategory: string;
  merchantName: string;
  installmentNumber: string;
  installmentTotal: string;
}

export const BillFormDialog: React.FC<Props> = ({
  open,
  bill,
  defaultCurrency,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation(['planning', 'transactions']);
  const isEdit = Boolean(bill);

  const [values, setValues] = useState<FormValues>({
    description: '',
    amount: '',
    currency: defaultCurrency,
    dueDate: localTodayIso(),
    dashboardCategory: 'billsfinancial',
    merchantName: '',
    installmentNumber: '',
    installmentTotal: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setError(null);
    setValues({
      description: bill?.description ?? '',
      amount: bill ? String(bill.amount) : '',
      currency: bill?.currency ?? defaultCurrency,
      dueDate: bill?.dueDate?.slice(0, 10) ?? localTodayIso(),
      dashboardCategory: bill?.dashboardCategory ?? 'billsfinancial',
      merchantName: bill?.merchantName ?? '',
      installmentNumber: bill?.installmentNumber ? String(bill.installmentNumber) : '',
      installmentTotal: bill?.installmentTotal ? String(bill.installmentTotal) : '',
    });
  }, [open, bill, defaultCurrency]);

  const change = (field: keyof FormValues) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  const submit = async () => {
    const amount = parseFloat(values.amount);
    const installmentNumber = values.installmentNumber ? parseInt(values.installmentNumber, 10) : undefined;
    const installmentTotal = values.installmentTotal ? parseInt(values.installmentTotal, 10) : undefined;

    if (!values.description.trim()) {
      setError(t('planning:bills.form.descriptionRequired'));
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t('planning:bills.form.amountInvalid'));
      return;
    }
    if (!values.dueDate) {
      setError(t('planning:bills.form.dueDateRequired'));
      return;
    }
    if (
      (installmentNumber === undefined) !== (installmentTotal === undefined) ||
      (installmentNumber !== undefined && installmentTotal !== undefined && installmentNumber > installmentTotal)
    ) {
      setError(t('planning:bills.form.installmentsInvalid'));
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSubmit({
        description: values.description.trim(),
        amount,
        currency: values.currency,
        dueDate: values.dueDate,
        dashboardCategory: values.dashboardCategory,
        merchantName: values.merchantName.trim() || undefined,
        installmentNumber,
        installmentTotal,
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
      <DialogTitle>
        {isEdit ? t('planning:bills.form.editTitle') : t('planning:bills.form.addTitle')}
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12}>
            <TextField
              label={t('planning:bills.form.description')}
              value={values.description}
              onChange={change('description')}
              fullWidth
              autoFocus
              inputProps={{ maxLength: 500 }}
            />
          </Grid>

          <Grid item xs={7} sm={8}>
            <TextField
              label={t('planning:bills.form.amount')}
              value={values.amount}
              onChange={change('amount')}
              fullWidth
              type="number"
              inputProps={{ min: 0.01, step: 0.01 }}
            />
          </Grid>

          <Grid item xs={5} sm={4}>
            <TextField
              select
              label={t('planning:bills.form.currency')}
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

          <Grid item xs={12} sm={6}>
            <TextField
              label={t('planning:bills.form.dueDate')}
              value={values.dueDate}
              onChange={change('dueDate')}
              fullWidth
              type="date"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              select
              label={t('planning:bills.form.category')}
              value={values.dashboardCategory}
              onChange={change('dashboardCategory')}
              fullWidth
            >
              {EXPENSE_CATEGORIES.map((category) => (
                <MenuItem key={category} value={category}>
                  {t(`transactions:dashboardCategories.expense.${category}`)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label={t('planning:bills.form.merchant')}
              value={values.merchantName}
              onChange={change('merchantName')}
              fullWidth
              inputProps={{ maxLength: 200 }}
            />
          </Grid>

          <Grid item xs={6} sm={3}>
            <TextField
              label={t('planning:bills.form.installmentNumber')}
              value={values.installmentNumber}
              onChange={change('installmentNumber')}
              fullWidth
              type="number"
              inputProps={{ min: 1, step: 1 }}
            />
          </Grid>

          <Grid item xs={6} sm={3}>
            <TextField
              label={t('planning:bills.form.installmentTotal')}
              value={values.installmentTotal}
              onChange={change('installmentTotal')}
              fullWidth
              type="number"
              inputProps={{ min: 1, step: 1 }}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>
          {t('planning:bills.form.cancel')}
        </Button>
        <Button onClick={submit} variant="contained" disabled={isSaving}>
          {t('planning:bills.form.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
