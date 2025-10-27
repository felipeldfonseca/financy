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

const currencyConfig = {
  USD: { symbol: '$', decimal: '.' },
  EUR: { symbol: '€', decimal: '.' },
  GBP: { symbol: '£', decimal: '.' },
  BRL: { symbol: 'R$', decimal: ',' },
  JPY: { symbol: '¥', decimal: '.' },
  CNY: { symbol: '¥', decimal: '.' },
};

const defaultCurrencies = Object.keys(currencyConfig);

// Category/Subcategory configuration (complete list)
const categoryConfig = {
  expense: {
    'Housing': ['Rent', 'Mortgage', 'Property Tax', 'Home Insurance', 'HOA Fees', 'Maintenance & Repairs', 'Home Improvement', 'Furniture & Appliances'],
    'Transportation': ['Fuel/Gas', 'Public Transport', 'Taxi/Ride Share', 'Car Payment', 'Car Insurance', 'Car Maintenance & Repairs', 'Parking', 'Tolls', 'Vehicle Registration'],
    'Food & Dining': ['Groceries', 'Restaurants', 'Fast Food', 'Coffee Shops', 'Bars & Nightlife', 'Food Delivery'],
    'Shopping': ['Clothing & Shoes', 'Electronics & Gadgets', 'Books & Magazines', 'Sporting Goods', 'Home Goods & Decor', 'Online Shopping', 'Other Shopping'],
    'Health & Fitness': ['Doctor Visits', 'Dentist', 'Pharmacy & Medications', 'Health Insurance', 'Gym & Fitness', 'Sports & Activities', 'Medical Devices'],
    'Entertainment': ['Streaming Services', 'Movies & Cinema', 'Concerts & Events', 'Hobbies', 'Games & Gaming', 'Sports Events', 'Music'],
    'Bills & Utilities': ['Electricity', 'Water', 'Gas', 'Internet', 'Mobile Phone', 'Landline', 'Cable/TV', 'Trash/Recycling'],
    'Education': ['Tuition', 'Books & Supplies', 'Courses & Training', 'Student Loan Payment', 'School Supplies'],
    'Personal Care': ['Haircuts & Salon', 'Spa & Massage', 'Cosmetics & Skincare', 'Personal Hygiene', 'Laundry & Dry Cleaning'],
    'Insurance': ['Life Insurance', 'Health Insurance', 'Car Insurance', 'Home Insurance', 'Other Insurance'],
    'Financial': ['Bank Fees', 'ATM Fees', 'Credit Card Fees', 'Investment Fees', 'Accounting & Legal', 'Taxes'],
    'Travel & Vacation': ['Flights', 'Hotels & Accommodation', 'Car Rental', 'Travel Insurance', 'Activities & Tours', 'Souvenirs'],
    'Gifts & Donations': ['Charity & Donations', 'Gifts for Others', 'Religious Donations'],
    'Pets': ['Pet Food', 'Veterinary Care', 'Pet Supplies', 'Pet Insurance', 'Grooming'],
    'Kids & Family': ['Childcare & Babysitting', 'Child Support', 'Kids Activities', 'Toys', 'School Fees', 'Allowance'],
    'Business Expenses': ['Office Supplies', 'Business Travel', 'Client Meetings', 'Software & Tools', 'Professional Services'],
    'Other Expenses': ['Miscellaneous', 'Uncategorized'],
  },
  income: {
    'Employment Income': ['Salary', 'Hourly Wages', 'Overtime Pay', 'Bonus', 'Commission', 'Tips', 'Severance Pay'],
    'Self-Employment': ['Freelance Income', 'Consulting Fees', 'Contract Work', 'Business Revenue', 'Royalties'],
    'Investment Income': ['Dividends', 'Interest Income', 'Capital Gains', 'Rental Income', 'Cryptocurrency Gains'],
    'Other Income': ['Gifts Received', 'Tax Refund', 'Reimbursement', 'Cashback & Rewards', 'Lottery & Gambling Winnings', 'Inheritance'],
    'Government & Benefits': ['Unemployment Benefits', 'Social Security', 'Pension', 'Disability Benefits', 'Child Support Received', 'Government Grants'],
    'Refunds & Returns': ['Purchase Refund', 'Insurance Claim', 'Expense Reimbursement'],
  },
  transfer: {
    'Account Transfers': ['Checking to Savings', 'Savings to Checking', 'Between Bank Accounts', 'Cash Deposit', 'Cash Withdrawal'],
    'Debt Payments': ['Credit Card Payment', 'Loan Payment', 'Mortgage Payment', 'Student Loan Payment'],
    'Savings & Investments': ['Investment Contribution', 'Retirement Account (401k, IRA)', 'Emergency Fund', 'Savings Goal'],
    'Personal Transfers': ['Money to Family/Friends', 'Money from Family/Friends', 'Split Bill Payment'],
    'Other Transfers': ['Currency Exchange', 'Wire Transfer', 'Other Transfer'],
  },
};

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
    setValue,
  } = useForm<CreateTransactionData>({
    resolver: yupResolver(transactionSchema),
    defaultValues: {
      amount: 0,
      description: '',
      type: 'expense',
      category: 'Housing',
      subcategory: 'Rent',
      currency: 'USD',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      merchantName: '',
      location: '',
      notes: '',
    },
  });

  const selectedType = watch('type');
  const selectedCategory = watch('category');
  const selectedCurrency = watch('currency') || 'USD';
  const currencySymbol = currencyConfig[selectedCurrency as keyof typeof currencyConfig]?.symbol || '$';
  const decimalSeparator = currencyConfig[selectedCurrency as keyof typeof currencyConfig]?.decimal || '.';

  // Get available categories based on transaction type
  const availableCategories = categoryConfig[selectedType as keyof typeof categoryConfig] || {};
  const categoryList = Object.keys(availableCategories);

  // Get available subcategories based on selected category
  const availableSubcategories = (selectedCategory && availableCategories[selectedCategory as keyof typeof availableCategories]) || [];

  useEffect(() => {
    if (open) {
      loadCategories();
      loadMerchants();
    }
  }, [open, loadCategories, loadMerchants]);

  useEffect(() => {
    if (open) {
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
      } else if (mode === 'create') {
        // Calculate categories for the default type ('expense')
        const defaultCategories = categoryConfig['expense'] || {};
        const defaultCategoryList = Object.keys(defaultCategories);
        const firstCategory = defaultCategoryList[0] || '';
        const firstSubcategory = firstCategory ? (defaultCategories as Record<string, string[]>)[firstCategory]?.[0] || '' : '';

        reset({
          amount: 0,
          description: '',
          type: 'expense',
          category: firstCategory,
          subcategory: firstSubcategory,
          currency: 'USD',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().slice(0, 5),
          merchantName: '',
          location: '',
          notes: '',
        });
      }
    }
  }, [open, mode, transaction, reset]);

  // Auto-select first category and subcategory when type changes
  useEffect(() => {
    if (open && mode === 'create') {
      const categories = categoryConfig[selectedType as keyof typeof categoryConfig] || {};
      const firstCategory = Object.keys(categories)[0] || '';
      const firstSubcategory = firstCategory ? (categories as Record<string, string[]>)[firstCategory]?.[0] || '' : '';

      setValue('category', firstCategory);
      setValue('subcategory', firstSubcategory);
    }
  }, [selectedType, open, mode, setValue]);

  // Auto-select first subcategory when category changes
  useEffect(() => {
    if (open && mode === 'create' && selectedCategory) {
      const categories = categoryConfig[selectedType as keyof typeof categoryConfig] || {};
      const subcategories = categories[selectedCategory as keyof typeof categories] || [];
      const firstSubcategory = subcategories[0] || '';

      setValue('subcategory', firstSubcategory);
    }
  }, [selectedCategory, selectedType, open, mode, setValue]);

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
                render={({ field }) => {
                  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value;

                    // Allow empty string
                    if (value === '') {
                      field.onChange('');
                      return;
                    }

                    // Define the correct decimal separator for this currency
                    const correctSeparator = decimalSeparator;
                    const wrongSeparator = correctSeparator === '.' ? ',' : '.';

                    // Block wrong separator entirely
                    if (value.includes(wrongSeparator)) {
                      return; // Don't update field
                    }

                    // Only allow digits and the correct decimal separator
                    const validCharPattern = new RegExp(`^[0-9${correctSeparator.replace('.', '\\.')}]*$`);
                    if (!validCharPattern.test(value)) {
                      return; // Don't update field
                    }

                    // Ensure only one decimal separator
                    const separatorCount = (value.match(new RegExp(`\\${correctSeparator}`, 'g')) || []).length;
                    if (separatorCount > 1) {
                      return; // Don't update field
                    }

                    // If there's a decimal separator, ensure max 2 decimal places
                    if (value.includes(correctSeparator)) {
                      const parts = value.split(correctSeparator);
                      if (parts[1] && parts[1].length > 2) {
                        return; // Don't update field
                      }
                    }

                    // Remove leading zeros (except if it's just "0" or "0." or "0,")
                    let cleanValue = value;
                    if (value.length > 1 && value.startsWith('0') && !value.startsWith(`0${correctSeparator}`)) {
                      cleanValue = value.replace(/^0+/, '');
                    }

                    // Update field with the clean value
                    field.onChange(cleanValue);
                  };

                  return (
                    <TextField
                      {...field}
                      label="Amount"
                      type="text"
                      fullWidth
                      required
                      error={!!errors.amount}
                      helperText={errors.amount?.message}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">{currencySymbol}</InputAdornment>,
                      }}
                      placeholder={`0${decimalSeparator}00`}
                      onChange={handleAmountChange}
                      value={field.value === 0 ? '' : field.value}
                    />
                  );
                }}
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
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      {...field}
                      label="Category"
                      value={field.value || ''}
                      error={!!errors.category}
                    >
                      {categoryList.map((category) => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="subcategory"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Subcategory</InputLabel>
                    <Select
                      {...field}
                      label="Subcategory"
                      value={field.value || ''}
                      error={!!errors.subcategory}
                    >
                      {availableSubcategories.map((subcategory) => (
                        <MenuItem key={subcategory} value={subcategory}>
                          {subcategory}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
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
                  <FormControl fullWidth>
                    <InputLabel>Currency</InputLabel>
                    <Select
                      {...field}
                      label="Currency"
                      value={field.value || 'USD'}
                      error={!!errors.currency}
                    >
                      {defaultCurrencies.map((currency) => (
                        <MenuItem key={currency} value={currency}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography>
                              {currencyConfig[currency as keyof typeof currencyConfig]?.symbol} {currency}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
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