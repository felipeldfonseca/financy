import React, { useState, useEffect, useMemo } from 'react';
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
import { useTranslation } from 'react-i18next';
import { CreateTransactionData, UpdateTransactionData, Transaction } from '../../services/transactionApi';
import { useTransactions } from '../../contexts/TransactionContext';
import { useFinancialContexts } from '../../contexts/ContextsContext';
import {
  getDashboardCategory,
  getDetailedCategoryForSubcategory,
  subcategoryTranslationPaths,
} from '../../utils/categoryMapping';

interface TransactionFormProps {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
  mode?: 'create' | 'edit';
}

const createTransactionSchema = (t: any) => {
  return yup.object({
    amount: yup
      .number()
      .required(t('form.amount.required'))
      .min(0.01, t('form.amount.minValue')),
    description: yup
      .string()
      .required(t('form.description.required'))
      .max(500, t('form.description.maxLength')),
    type: yup
      .string()
      .oneOf(['expense', 'income', 'transfer'], t('form.type.invalid'))
      .required(t('form.type.required')),
    category: yup.string(),
    subcategory: yup.string(),
    currency: yup.string(),
    date: yup.string().required(t('form.date.required')),
    time: yup.string(),
    merchantName: yup.string().max(200, t('form.merchant.maxLength')),
    location: yup.string().max(300, t('form.location.maxLength')),
    notes: yup.string().max(1000, t('form.notes.maxLength')),
  }).shape({}) as yup.ObjectSchema<CreateTransactionData>;
};

const currencyConfig = {
  USD: { symbol: '$', decimal: '.' },
  EUR: { symbol: '€', decimal: '.' },
  GBP: { symbol: '£', decimal: '.' },
  BRL: { symbol: 'R$', decimal: ',' },
  JPY: { symbol: '¥', decimal: '.' },
  CNY: { symbol: '¥', decimal: '.' },
};

const defaultCurrencies = Object.keys(currencyConfig);

// Dashboard Category configuration - simplified categories for form selection
const getDashboardCategoryConfig = (t: any) => ({
  expense: {
    'housing': [
      // Housing subcategories from multiple detailed categories
      'rent', 'utilities', 'maintenance', 'furniture', // from housing
      'home' // from insurance
    ],
    'transportation': [
      // Transportation subcategories 
      'fuel', 'maintenance', 'parking', 'public', 'rideshare', // from transportation
      'auto' // from insurance
    ],
    'fooddining': [
      // Food & Dining subcategories
      'groceries', 'restaurants', 'fastfood', 'coffee', 'delivery' // from food
    ],
    'healthfitness': [
      // Health & Fitness subcategories
      'doctor', 'prescription', 'dental', 'vision', 'gym', 'sports', // from healthfitness
      'health' // from insurance
    ],
    'entertainmentshopping': [
      // Entertainment & Shopping subcategories
      'movies', 'hobbies', 'subscriptions', 'gaming', // from entertainment
      'clothing', 'electronics', 'gifts', 'books', // from shopping
      'hygiene', 'cosmetics', 'haircare', 'skincare', 'wellness' // from personalcare
    ],
    'billsfinancial': [
      // Bills & Financial subcategories
      'phone', 'internet', 'electricity', 'water', 'gas', // from bills
      'bankfees', 'investment', 'advisor', 'taxes', 'accounting', // from financial
      'life', 'disability' // from insurance
    ],
    'travellifestyle': [
      // Travel & Lifestyle subcategories
      'flights', 'hotels', 'vacation', 'business', // from travelvacation
      'food', 'veterinary', 'grooming', 'supplies', // from pets (pet food -> petfood to avoid conflict)
      'childcare', 'diapers', 'toys', 'activities', 'familytrips' // from kidsfamily
    ],
    'other': [
      // Other subcategories
      'tuition', 'courses', 'training', // from education
      'charity', 'religious', 'political', 'nonprofit', // from giftdonations
      'office', 'marketing', 'equipment', 'software', // from businessexpenses
      'miscellaneous', 'fees', 'unexpected', 'emergency' // from otherexpenses
    ]
  },
  income: {
    'employment': [
      // Employment subcategories
      'salary', 'bonus', 'overtime', 'commission', // from employment
      'freelance', 'consulting', 'contracting' // from selfemployment
    ],
    'investment': [
      // Investment subcategories
      'dividends', 'interest', 'capital', 'rental', // from investment
      'revenue', 'partnership', 'royalties', 'licensing' // from business
    ],
    'governmentbenefits': [
      // Government & Benefits subcategories
      'unemployment', 'retirement', 'disability', 'social', 'tax', // from governmentbenefits
      'purchases', 'services', 'warranty', 'overpayment' // from refundsreturns
    ],
    'other': [
      // Other Income subcategories
      'gifts', 'lottery', 'found', 'cashback', 'miscellaneous' // from otherincome
    ]
  },
  transfer: {
    'accounts': [
      // Account Transfers subcategories
      'checking', 'savings', 'investment', // from accounts
      'retirement', 'emergency' // from savingsinvestments
    ],
    'debt': [
      // Debt Payments subcategories
      'credit', 'loan', 'mortgage' // from debt
    ],
    'other': [
      // Other Transfers subcategories
      'family', 'friends', 'spouse', 'children', // from personaltransfers
      'business', 'charity', 'temporary' // from othertransfers
    ]
  }
});

// Helper function to get translated dashboard category names
const getTranslatedDashboardCategories = (t: any, type: string) => {
  const config = getDashboardCategoryConfig(t)[type as keyof ReturnType<typeof getDashboardCategoryConfig>] || {};
  return Object.keys(config).reduce((acc, key) => {
    acc[key] = t(`dashboardCategories.${type}.${key}`);
    return acc;
  }, {} as Record<string, string>);
};

// Helper function to get translated subcategory names for dashboard categories
const getTranslatedSubcategories = (t: any, type: string, dashboardCategory: string): { key: string; name: string }[] => {
  const config = getDashboardCategoryConfig(t)[type as keyof ReturnType<typeof getDashboardCategoryConfig>] || {};
  const subcategories = config[dashboardCategory as keyof typeof config] as string[] || [];

  return subcategories.map((sub: string) => {
    const translationKey = subcategoryTranslationPaths[sub] || `categories.${type}.other.${sub}`;

    return {
      key: sub,
      name: t(translationKey, sub) // Fallback to key if translation missing
    };
  });
};

export const TransactionForm: React.FC<TransactionFormProps> = ({
  open,
  onClose,
  transaction,
  mode = 'create',
}) => {
  const { t } = useTranslation('transactions');
  const { state, createTransaction, updateTransaction, loadCategories, loadMerchants } = useTransactions();
  const { selectedContextId } = useFinancialContexts();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize the resolver to avoid unnecessary re-creation
  const resolver = useMemo(() => yupResolver(createTransactionSchema(t)), [t]);
  
  const form = useForm<CreateTransactionData>({
    resolver,
    defaultValues: {
      amount: 0,
      description: '',
      type: 'expense',
      category: 'housing', // Use key instead of translated name
      subcategory: 'rent', // Use key instead of translated name
      currency: 'USD',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      merchantName: '',
      location: '',
      notes: '',
    },
    mode: 'onChange',
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
    setValue,
  } = form;

  const selectedType = watch('type');
  const selectedCategory = watch('category');
  const selectedCurrency = watch('currency') || 'USD';
  const currencySymbol = currencyConfig[selectedCurrency as keyof typeof currencyConfig]?.symbol || '$';
  const decimalSeparator = currencyConfig[selectedCurrency as keyof typeof currencyConfig]?.decimal || '.';

  // Get available dashboard categories based on transaction type (translated)
  const translatedCategories = getTranslatedDashboardCategories(t, selectedType);
  const categoryList = Object.keys(translatedCategories);

  // Get available subcategories based on selected dashboard category (translated)
  const availableSubcategories = selectedCategory ? getTranslatedSubcategories(t, selectedType, selectedCategory) : [];

  // Note: Form resolver will automatically use the updated schema when validation is triggered
  // since createTransactionSchema(t) is recreated on each render with the current translation function

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
          // Stored category is the detailed key; the dropdown works with
          // dashboard category keys, so map it back for editing.
          category: transaction.category
            ? getDashboardCategory(transaction.type, transaction.category)
            : '',
          subcategory: transaction.subcategory || '',
          currency: transaction.currency,
          date: transaction.date,
          time: transaction.time || '',
          merchantName: transaction.merchantName || '',
          location: transaction.location || '',
          notes: transaction.notes || '',
        });
      } else if (mode === 'create') {
        // Calculate categories for the default type ('expense') using dashboard keys
        const config = getDashboardCategoryConfig(t)['expense'] || {};
        const categoryKeys = Object.keys(config);
        const firstCategory = categoryKeys[0] || 'housing';
        const firstSubcategory = firstCategory ? config[firstCategory as keyof typeof config]?.[0] || 'rent' : 'rent';

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, transaction, reset]);

  // Auto-select first category and subcategory when type changes
  useEffect(() => {
    if (open && mode === 'create') {
      const config = getDashboardCategoryConfig(t)[selectedType as keyof ReturnType<typeof getDashboardCategoryConfig>] || {};
      const categoryKeys = Object.keys(config);
      const firstCategory = categoryKeys[0] || '';
      const firstSubcategory = firstCategory ? config[firstCategory as keyof typeof config]?.[0] || '' : '';

      setValue('category', firstCategory);
      setValue('subcategory', firstSubcategory);
    }
  }, [selectedType, open, mode, setValue, t]);

  // Auto-select first subcategory when category changes
  useEffect(() => {
    if (open && mode === 'create' && selectedCategory) {
      const config = getDashboardCategoryConfig(t)[selectedType as keyof ReturnType<typeof getDashboardCategoryConfig>] || {};
      const subcategories = config[selectedCategory as keyof typeof config] || [];
      const firstSubcategory = subcategories[0] || '';

      setValue('subcategory', firstSubcategory);
    }
  }, [selectedCategory, selectedType, open, mode, setValue, t]);

  const onSubmit = async (data: CreateTransactionData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // The form's category dropdown holds the dashboard category key; the
      // stored category must be the detailed key derived from the subcategory
      // (e.g. 'groceries' -> 'food') so list translations and dashboard
      // grouping resolve correctly.
      const enhancedData = {
        ...data,
        category: getDetailedCategoryForSubcategory(data.type, data.subcategory) || data.category,
        dashboardCategory: data.category,
        // A transaction added while a shared context is selected belongs to
        // that context, so the other members can see it.
        ...(mode === 'create' && selectedContextId ? { contextId: selectedContextId } : {}),
      };

      if (mode === 'create') {
        await createTransaction(enhancedData);
      } else if (mode === 'edit' && transaction) {
        await updateTransaction(transaction.id, enhancedData as UpdateTransactionData);
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
        {mode === 'create' ? t('form.addTitle') : t('form.editTitle')}
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
                      label={t('form.amount.label')}
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
                    <InputLabel>{t('form.type.label')}</InputLabel>
                    <Select {...field} label={t('form.type.label')} error={!!errors.type}>
                      <MenuItem value="expense">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography color="error.main">{t('form.type.expense')}</Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="income">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography color="success.main">{t('form.type.income')}</Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="transfer">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography color="info.main">{t('form.type.transfer')}</Typography>
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
                    label={t('form.description.label')}
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
                    <InputLabel>{t('form.category.label')}</InputLabel>
                    <Select
                      {...field}
                      label={t('form.category.label')}
                      value={field.value || ''}
                      error={!!errors.category}
                    >
                      {categoryList.map((category) => (
                        <MenuItem key={category} value={category}>
                          {translatedCategories[category]}
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
                    <InputLabel>{t('form.subcategory.label')}</InputLabel>
                    <Select
                      {...field}
                      label={t('form.subcategory.label')}
                      value={field.value || ''}
                      error={!!errors.subcategory}
                    >
                      {availableSubcategories.map((subcategory: { key: string; name: string }) => (
                        <MenuItem key={subcategory.key} value={subcategory.key}>
                          {subcategory.name}
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
                    label={t('form.date.label')}
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
                    label={t('form.time.label')}
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
                        label={t('form.merchant.label')}
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
                    label={t('form.location.label')}
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
                    <InputLabel>{t('form.currency.label')}</InputLabel>
                    <Select
                      {...field}
                      label={t('form.currency.label')}
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
                    label={t('form.notes.label')}
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
            {t('form.buttons.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            color={getTypeColor(selectedType) as any}
          >
            {isSubmitting ? t('form.buttons.saving') : mode === 'create' ? t('form.buttons.add') : t('form.buttons.update')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};