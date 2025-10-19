import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  InputAdornment,
  Typography,
  Alert,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { CreateTransactionData, UpdateTransactionData, Transaction } from '../../services/transactionApi';
import { useTransactions } from '../../contexts/TransactionContext';

interface TransactionFormProps {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
  mode?: 'create' | 'edit';
}

const transactionSchema = yup.object({
  amount: yup
    .number()
    .required('Amount is required')
    .min(0.01, 'Amount must be greater than 0'),
  description: yup
    .string()
    .required('Description is required')
    .max(500, 'Description must be less than 500 characters'),
  type: yup
    .string()
    .oneOf(['expense', 'income', 'transfer'], 'Invalid transaction type')
    .required('Transaction type is required'),
  category: yup.string(),
  subcategory: yup.string(),
  currency: yup.string(),
  date: yup.string().required('Date is required'),
  time: yup.string(),
  merchantName: yup.string().max(200, 'Merchant name must be less than 200 characters'),
  location: yup.string().max(300, 'Location must be less than 300 characters'),
  notes: yup.string().max(1000, 'Notes must be less than 1000 characters'),
}).shape({}) as yup.ObjectSchema<CreateTransactionData>;

const defaultCurrencies = ['USD', 'EUR', 'GBP', 'BRL', 'JPY', 'CNY'];

export const TransactionForm: React.FC<TransactionFormProps> = ({
  open,
  onClose,
  transaction,
  mode = 'create',
}) => {
  const { state, createTransaction, updateTransaction, loadCategories, loadMerchants } = useTransactions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm<CreateTransactionData>({
    resolver: yupResolver(transactionSchema),
    defaultValues: {
      amount: 0,
      description: '',
      type: 'expense',
      category: '',
      subcategory: '',
      currency: 'USD',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      merchantName: '',
      location: '',
      notes: '',
    },
  });

  const selectedType = watch('type');

  useEffect(() => {
    if (open) {
      loadCategories();
      loadMerchants();

      if (mode === 'edit' && transaction) {
        reset({
          amount: Number(transaction.amount),
          description: transaction.description,
          type: transaction.type,
          category: transaction.category || '',
          subcategory: transaction.subcategory || '',
          currency: transaction.currency,
          date: transaction.date,
          time: transaction.time || '',
          merchantName: transaction.merchantName || '',
          location: transaction.location || '',
          notes: transaction.notes || '',
        });
      } else {
        reset({
          amount: 0,
          description: '',
          type: 'expense',
          category: '',
          subcategory: '',
          currency: 'USD',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().slice(0, 5),
          merchantName: '',
          location: '',
          notes: '',
        });
      }
    }
  }, [open, mode, transaction, reset, loadCategories, loadMerchants]);

  const onSubmit = async (data: CreateTransactionData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (mode === 'create') {
        await createTransaction(data);
      } else if (mode === 'edit' && transaction) {
        await updateTransaction(transaction.id, data as UpdateTransactionData);
      }

      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income':
        return 'success';
      case 'expense':
        return 'error';
      case 'transfer':
        return 'info';
      default:
        return 'primary';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === 'create' ? 'Add New Transaction' : 'Edit Transaction'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Amount and Type */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="amount"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Amount"
                    type="number"
                    fullWidth
                    required
                    error={!!errors.amount}
                    helperText={errors.amount?.message}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth required>
                    <InputLabel>Type</InputLabel>
                    <Select {...field} label="Type" error={!!errors.type}>
                      <MenuItem value="expense">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography color="error.main">Expense</Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="income">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography color="success.main">Income</Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="transfer">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography color="info.main">Transfer</Typography>
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Description"
                    fullWidth
                    required
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                )}
              />
            </Grid>

            {/* Category and Subcategory */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    {...field}
                    options={state.categories}
                    freeSolo
                    value={field.value || ''}
                    onChange={(_, value) => field.onChange(value || '')}
                    onInputChange={(_, value) => field.onChange(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Category"
                        error={!!errors.category}
                        helperText={errors.category?.message}
                      />
                    )}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="subcategory"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Subcategory"
                    fullWidth
                    error={!!errors.subcategory}
                    helperText={errors.subcategory?.message}
                  />
                )}
              />
            </Grid>

            {/* Date and Time */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Date"
                    type="date"
                    fullWidth
                    required
                    error={!!errors.date}
                    helperText={errors.date?.message}
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="time"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Time"
                    type="time"
                    fullWidth
                    error={!!errors.time}
                    helperText={errors.time?.message}
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </Grid>

            {/* Merchant and Location */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="merchantName"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    {...field}
                    options={state.merchants}
                    freeSolo
                    value={field.value || ''}
                    onChange={(_, value) => field.onChange(value || '')}
                    onInputChange={(_, value) => field.onChange(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Merchant"
                        error={!!errors.merchantName}
                        helperText={errors.merchantName?.message}
                      />
                    )}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="location"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Location"
                    fullWidth
                    error={!!errors.location}
                    helperText={errors.location?.message}
                  />
                )}
              />
            </Grid>

            {/* Currency */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    {...field}
                    options={defaultCurrencies}
                    freeSolo
                    value={field.value || 'USD'}
                    onChange={(_, value) => field.onChange(value || 'USD')}
                    onInputChange={(_, value) => field.onChange(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Currency"
                        error={!!errors.currency}
                        helperText={errors.currency?.message}
                      />
                    )}
                  />
                )}
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Notes"
                    fullWidth
                    multiline
                    rows={3}
                    error={!!errors.notes}
                    helperText={errors.notes?.message}
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            color={getTypeColor(selectedType) as any}
          >
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Add Transaction' : 'Update Transaction'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};