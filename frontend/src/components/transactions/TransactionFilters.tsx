import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Button,
  Box,
  Chip,
  Typography,
  Collapse,
  IconButton,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';\nimport { useTranslation } from 'react-i18next';
import { TransactionFilters } from '../../services/transactionApi';
import { useTransactions } from '../../contexts/TransactionContext';

interface TransactionFiltersProps {
  onFiltersChange: (filters: TransactionFilters) => void;
}

type DateFilterPeriod = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'allTime' | 'custom';

export const TransactionFiltersComponent: React.FC<TransactionFiltersProps> = ({
  onFiltersChange,
}) => {
  const { state, loadCategories, loadMerchants } = useTransactions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [expanded, setExpanded] = useState(false);
  const [dateFilterPeriod, setDateFilterPeriod] = useState<DateFilterPeriod>('thisMonth');
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    limit: 20,
    sortBy: 'date',
    sortOrder: 'DESC',
  });
  const isInitialMount = useRef(true);

  useEffect(() => {
    loadCategories();
    loadMerchants();
  }, [loadCategories, loadMerchants]);

  // Helper function to parse filters from URL
  const parseFiltersFromURL = (): TransactionFilters => {
    const urlFilters: TransactionFilters = {
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
      sortBy: (searchParams.get('sortBy') as 'date' | 'amount' | 'description' | 'createdAt') || 'date',
      sortOrder: (searchParams.get('sortOrder') as 'ASC' | 'DESC') || 'DESC',
    };

    if (searchParams.get('startDate')) urlFilters.startDate = searchParams.get('startDate')!;
    if (searchParams.get('endDate')) urlFilters.endDate = searchParams.get('endDate')!;
    if (searchParams.get('type')) urlFilters.type = searchParams.get('type') as any;
    if (searchParams.get('status')) urlFilters.status = searchParams.get('status') as any;
    if (searchParams.get('category')) urlFilters.category = searchParams.get('category')!;
    if (searchParams.get('subcategory')) urlFilters.subcategory = searchParams.get('subcategory')!;
    if (searchParams.get('currency')) urlFilters.currency = searchParams.get('currency')!;
    if (searchParams.get('merchantName')) urlFilters.merchantName = searchParams.get('merchantName')!;
    if (searchParams.get('search')) urlFilters.search = searchParams.get('search')!;
    if (searchParams.get('minAmount')) urlFilters.minAmount = parseFloat(searchParams.get('minAmount')!);
    if (searchParams.get('maxAmount')) urlFilters.maxAmount = parseFloat(searchParams.get('maxAmount')!);

    return urlFilters;
  };

  // Helper function to update URL with current filters
  const updateURL = useCallback((newFilters: TransactionFilters) => {
    const params = new URLSearchParams();

    // Always include pagination and sorting
    params.set('page', newFilters.page?.toString() || '1');
    params.set('limit', newFilters.limit?.toString() || '20');
    params.set('sortBy', newFilters.sortBy || 'date');
    params.set('sortOrder', newFilters.sortOrder || 'DESC');

    // Only add optional filters if they have values
    if (newFilters.startDate) params.set('startDate', newFilters.startDate);
    if (newFilters.endDate) params.set('endDate', newFilters.endDate);
    if (newFilters.type) params.set('type', newFilters.type);
    if (newFilters.status) params.set('status', newFilters.status);
    if (newFilters.category) params.set('category', newFilters.category);
    if (newFilters.subcategory) params.set('subcategory', newFilters.subcategory);
    if (newFilters.currency) params.set('currency', newFilters.currency);
    if (newFilters.merchantName) params.set('merchantName', newFilters.merchantName);
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.minAmount !== undefined) params.set('minAmount', newFilters.minAmount.toString());
    if (newFilters.maxAmount !== undefined) params.set('maxAmount', newFilters.maxAmount.toString());

    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  const formatDateForApi = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Helper function to detect which period the current dates represent
  const detectDatePeriod = useCallback((startDate?: string, endDate?: string): DateFilterPeriod => {
    if (!startDate || !endDate) return 'allTime';

    const now = new Date();
    const today = formatDateForApi(now);

    // Today
    if (startDate === today && endDate === today) return 'today';

    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateForApi(yesterday);
    if (startDate === yesterdayStr && endDate === yesterdayStr) return 'yesterday';

    // Last 7 days
    const last7 = new Date(now);
    last7.setDate(last7.getDate() - 7);
    const last7Str = formatDateForApi(last7);
    if (startDate === last7Str && endDate === today) return 'last7days';

    // Last 30 days
    const last30 = new Date(now);
    last30.setDate(last30.getDate() - 30);
    const last30Str = formatDateForApi(last30);
    if (startDate === last30Str && endDate === today) return 'last30days';

    // This Month
    const monthStart = formatDateForApi(new Date(now.getFullYear(), now.getMonth(), 1));
    if (startDate === monthStart && endDate === today) return 'thisMonth';

    // Last Month
    const lastMonthStart = formatDateForApi(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const lastMonthEnd = formatDateForApi(new Date(now.getFullYear(), now.getMonth(), 0));
    if (startDate === lastMonthStart && endDate === lastMonthEnd) return 'lastMonth';

    // This Year
    const yearStart = formatDateForApi(new Date(now.getFullYear(), 0, 1));
    if (startDate === yearStart && endDate === today) return 'thisYear';

    // Last Year
    const lastYearStart = formatDateForApi(new Date(now.getFullYear() - 1, 0, 1));
    const lastYearEnd = formatDateForApi(new Date(now.getFullYear() - 1, 11, 31));
    if (startDate === lastYearStart && endDate === lastYearEnd) return 'lastYear';

    return 'custom';
  }, []);

  // Initialize from URL on mount
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;

      const urlFilters = parseFiltersFromURL();

      // If URL has no date filters, apply default "This Month"
      if (!urlFilters.startDate && !urlFilters.endDate) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        urlFilters.startDate = formatDateForApi(monthStart);
        urlFilters.endDate = formatDateForApi(now);
        // Only update URL if we're applying defaults (no dates in URL)
        updateURL(urlFilters);
      }

      const period = detectDatePeriod(urlFilters.startDate, urlFilters.endDate);
      setDateFilterPeriod(period);
      setFilters(urlFilters);
      onFiltersChange(urlFilters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const applyDateFilter = useCallback((period: DateFilterPeriod) => {
    setDateFilterPeriod(period);
    const now = new Date();
    let startDate: string | undefined;
    let endDate: string | undefined;

    switch (period) {
      case 'today':
        startDate = formatDateForApi(now);
        endDate = formatDateForApi(now);
        break;

      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = formatDateForApi(yesterday);
        endDate = formatDateForApi(yesterday);
        break;

      case 'last7days':
        const last7 = new Date(now);
        last7.setDate(last7.getDate() - 7);
        startDate = formatDateForApi(last7);
        endDate = formatDateForApi(now);
        break;

      case 'last30days':
        const last30 = new Date(now);
        last30.setDate(last30.getDate() - 30);
        startDate = formatDateForApi(last30);
        endDate = formatDateForApi(now);
        break;

      case 'thisMonth':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = formatDateForApi(monthStart);
        endDate = formatDateForApi(now);
        break;

      case 'lastMonth':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        startDate = formatDateForApi(lastMonthStart);
        endDate = formatDateForApi(lastMonthEnd);
        break;

      case 'thisYear':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        startDate = formatDateForApi(yearStart);
        endDate = formatDateForApi(now);
        break;

      case 'lastYear':
        const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
        startDate = formatDateForApi(lastYearStart);
        endDate = formatDateForApi(lastYearEnd);
        break;

      case 'allTime':
        startDate = undefined;
        endDate = undefined;
        break;

      case 'custom':
        // Keep existing dates or clear them
        return;
    }

    const newFilters = {
      ...filters,
      startDate,
      endDate,
      page: 1,
    };
    setFilters(newFilters);
    updateURL(newFilters);
    onFiltersChange(newFilters);
  }, [filters, onFiltersChange, updateURL]);

  const handleFilterChange = (key: keyof TransactionFilters, value: any) => {
    const newFilters = {
      ...filters,
      [key]: value,
      page: 1, // Reset to first page when filters change
    };
    setFilters(newFilters);

    // If manually changing date fields, switch to custom mode and detect period
    if (key === 'startDate' || key === 'endDate') {
      const period = detectDatePeriod(
        key === 'startDate' ? value : newFilters.startDate,
        key === 'endDate' ? value : newFilters.endDate
      );
      setDateFilterPeriod(period);
    }

    updateURL(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    // Apply "This Month" filter when clearing
    setDateFilterPeriod('thisMonth');
    applyDateFilter('thisMonth');
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.type) count++;
    if (filters.status) count++;
    if (filters.category) count++;
    if (filters.merchantName) count++;
    if (filters.search) count++;
    if (filters.minAmount !== undefined) count++;
    if (filters.maxAmount !== undefined) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card sx={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '20px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <FilterIcon />
            <Typography variant="h6">Filters</Typography>
            {activeFiltersCount > 0 && (
              <Chip
                label={`${activeFiltersCount} active`}
                size="small"
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  fontWeight: 500,
                }}
              />
            )}
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            {activeFiltersCount > 0 && (
              <Button
                size="small"
                onClick={handleClearFilters}
                startIcon={<ClearIcon />}
                sx={{
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 2,
                  py: 1,
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(239, 68, 68, 0.15)',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                Clear All
              </Button>
            )}
            <IconButton 
              onClick={() => setExpanded(!expanded)}
              sx={{
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: 'rgba(255,255,255,0.15)',
                  transform: 'scale(1.05)',
                },
              }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        {/* Date Filter Quick Buttons */}
        <Box sx={{ mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <CalendarIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Time Period
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            {[
              { value: 'today', label: 'Today' },
              { value: 'yesterday', label: 'Yesterday' },
              { value: 'last7days', label: 'Last 7 Days' },
              { value: 'last30days', label: 'Last 30 Days' },
              { value: 'thisMonth', label: 'This Month' },
              { value: 'lastMonth', label: 'Last Month' },
              { value: 'thisYear', label: 'This Year' },
              { value: 'allTime', label: 'All Time' },
            ].map((period) => (
              <Button
                key={period.value}
                variant={dateFilterPeriod === period.value ? 'contained' : 'outlined'}
                size="small"
                onClick={() => applyDateFilter(period.value as DateFilterPeriod)}
                sx={{
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 2,
                  py: 0.75,
                  minWidth: 'auto',
                  ...(dateFilterPeriod === period.value ? {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)',
                    },
                  } : {
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'text.secondary',
                    '&:hover': {
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      transform: 'translateY(-1px)',
                    },
                  }),
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {period.label}
              </Button>
            ))}
            <Button
              variant={dateFilterPeriod === 'custom' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => {
                setDateFilterPeriod('custom');
                setExpanded(true);
              }}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 500,
                px: 2,
                py: 0.75,
                minWidth: 'auto',
                ...(dateFilterPeriod === 'custom' ? {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)',
                  },
                } : {
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'text.secondary',
                  '&:hover': {
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    transform: 'translateY(-1px)',
                  },
                }),
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              Custom Range
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

        {/* Always visible filters */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Search"
              fullWidth
              size="small"
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Description, merchant, notes..."
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={filters.type || ''}
                onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
                label="Type"
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="expense">Expense</MenuItem>
                <MenuItem value="income">Income</MenuItem>
                <MenuItem value="transfer">Transfer</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                label="Status"
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Autocomplete
              options={state.categories}
              value={filters.category || ''}
              onChange={(_, value) => handleFilterChange('category', value || undefined)}
              renderInput={(params) => (
                <TextField {...params} label="Category" size="small" />
              )}
              freeSolo
            />
          </Grid>
        </Grid>

        {/* Expandable filters */}
        <Collapse in={expanded}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Start Date"
                type="date"
                fullWidth
                size="small"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="End Date"
                type="date"
                fullWidth
                size="small"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Autocomplete
                options={state.merchants}
                value={filters.merchantName || ''}
                onChange={(_, value) => handleFilterChange('merchantName', value || undefined)}
                renderInput={(params) => (
                  <TextField {...params} label="Merchant" size="small" />
                )}
                freeSolo
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Currency</InputLabel>
                <Select
                  value={filters.currency || ''}
                  onChange={(e) => handleFilterChange('currency', e.target.value || undefined)}
                  label="Currency"
                >
                  <MenuItem value="">All Currencies</MenuItem>
                  <MenuItem value="USD">USD</MenuItem>
                  <MenuItem value="EUR">EUR</MenuItem>
                  <MenuItem value="GBP">GBP</MenuItem>
                  <MenuItem value="BRL">BRL</MenuItem>
                  <MenuItem value="JPY">JPY</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Min Amount"
                type="number"
                fullWidth
                size="small"
                value={filters.minAmount || ''}
                onChange={(e) => handleFilterChange('minAmount', parseFloat(e.target.value) || undefined)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Max Amount"
                type="number"
                fullWidth
                size="small"
                value={filters.maxAmount || ''}
                onChange={(e) => handleFilterChange('maxAmount', parseFloat(e.target.value) || undefined)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={filters.sortBy || 'date'}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  label="Sort By"
                >
                  <MenuItem value="date">Date</MenuItem>
                  <MenuItem value="amount">Amount</MenuItem>
                  <MenuItem value="description">Description</MenuItem>
                  <MenuItem value="createdAt">Created</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort Order</InputLabel>
                <Select
                  value={filters.sortOrder || 'DESC'}
                  onChange={(e) => handleFilterChange('sortOrder', e.target.value as 'ASC' | 'DESC')}
                  label="Sort Order"
                >
                  <MenuItem value="DESC">Newest First</MenuItem>
                  <MenuItem value="ASC">Oldest First</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Collapse>
      </CardContent>
    </Card>
  );
};