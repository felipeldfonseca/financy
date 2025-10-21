import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Typography,
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  EditOutlined as EditIcon,
  DeleteOutline as DeleteIcon,
  CheckCircleOutline as CheckIcon,
  CancelOutlined as CancelIcon,
  ReceiptLong as ReceiptIcon,
  ArrowUpward as IncomeIcon,
  ArrowDownward as ExpenseIcon,
  SwapHorizontalCircle as TransferIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { Transaction } from '../../services/transactionApi';
import { useTransactions } from '../../contexts/TransactionContext';

interface TransactionListProps {
  onEditTransaction: (transaction: Transaction) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({ onEditTransaction }) => {
  const theme = useTheme();
  const { state, loadTransactions, deleteTransaction, confirmTransaction, cancelTransaction } = useTransactions();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, transaction: Transaction) => {
    setAnchorEl(event.currentTarget);
    setSelectedTransaction(transaction);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTransaction(null);
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    loadTransactions({ ...state.filters, page: newPage + 1 });
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(event.target.value, 10);
    loadTransactions({ ...state.filters, page: 1, limit: newLimit });
  };

  const handleEdit = () => {
    if (selectedTransaction) {
      onEditTransaction(selectedTransaction);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (selectedTransaction) {
      try {
        await deleteTransaction(selectedTransaction.id);
        await loadTransactions(state.filters);
      } catch (error) {
        console.error('Failed to delete transaction:', error);
      }
    }
    handleMenuClose();
  };

  const handleConfirm = async () => {
    if (selectedTransaction) {
      try {
        await confirmTransaction(selectedTransaction.id);
        await loadTransactions(state.filters);
      } catch (error) {
        console.error('Failed to confirm transaction:', error);
      }
    }
    handleMenuClose();
  };

  const handleCancel = async () => {
    if (selectedTransaction) {
      try {
        await cancelTransaction(selectedTransaction.id);
        await loadTransactions(state.filters);
      } catch (error) {
        console.error('Failed to cancel transaction:', error);
      }
    }
    handleMenuClose();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'income':
        return <IncomeIcon sx={{ color: theme.palette.success.main }} />;
      case 'expense':
        return <ExpenseIcon sx={{ color: theme.palette.error.main }} />;
      case 'transfer':
        return <TransferIcon sx={{ color: theme.palette.info.main }} />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income':
        return theme.palette.success.main;
      case 'expense':
        return theme.palette.error.main;
      case 'transfer':
        return theme.palette.info.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatAmount = (amount: number, currency: string, type: string) => {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);

    return (
      <Typography
        variant="body2"
        fontWeight="medium"
        sx={{ color: getTypeColor(type) }}
      >
        {type === 'income' ? '+' : type === 'expense' ? '-' : ''}
        <Typography component="span" variant="numeric">{formattedAmount}</Typography>
      </Typography>
    );
  };

  const formatDate = (dateString: string, timeString?: string) => {
    const date = new Date(dateString);
    const dateFormatted = format(date, 'MMM dd, yyyy');
    
    if (timeString) {
      return (
        <Box>
          <Typography variant="body2">{dateFormatted}</Typography>
          <Typography variant="caption" color="text.secondary">
            {timeString}
          </Typography>
        </Box>
      );
    }
    
    return dateFormatted;
  };

  if (state.transactions.length === 0 && !state.isLoading) {
    return (
      <Card sx={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
      }}>
        <CardContent>
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            py={4}
          >
            <ReceiptIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No transactions found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add your first transaction to get started
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '20px',
      overflow: 'hidden',
    }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: 'text.primary',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'rgba(255,255,255,0.05)',
              }}>Type</TableCell>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: 'text.primary',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'rgba(255,255,255,0.05)',
              }}>Description</TableCell>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: 'text.primary',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'rgba(255,255,255,0.05)',
              }}>Category</TableCell>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: 'text.primary',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'rgba(255,255,255,0.05)',
              }}>Amount</TableCell>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: 'text.primary',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'rgba(255,255,255,0.05)',
              }}>Date</TableCell>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: 'text.primary',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'rgba(255,255,255,0.05)',
              }}>Status</TableCell>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: 'text.primary',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'rgba(255,255,255,0.05)',
              }}>Merchant</TableCell>
              <TableCell align="right" sx={{ 
                fontWeight: 600, 
                color: 'text.primary',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'rgba(255,255,255,0.05)',
              }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {state.transactions.map((transaction) => (
              <TableRow
                key={transaction.id}
                hover
                sx={{
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: alpha(getTypeColor(transaction.type), 0.08),
                    transform: 'scale(1.005)',
                  },
                  '&:last-child td': {
                    borderBottom: 'none',
                  },
                }}
              >
                <TableCell sx={{ borderBottom: 'none' }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getTypeIcon(transaction.type)}
                    <Typography variant="body2" textTransform="capitalize">
                      {transaction.type}
                    </Typography>
                  </Box>
                </TableCell>
                
                <TableCell sx={{ borderBottom: 'none' }}>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {transaction.description}
                    </Typography>
                    {transaction.notes && (
                      <Typography variant="caption" color="text.secondary">
                        {transaction.notes}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                
                <TableCell sx={{ borderBottom: 'none' }}>
                  {transaction.category && (
                    <Chip
                      label={transaction.category}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: alpha(getTypeColor(transaction.type), 0.3),
                        color: getTypeColor(transaction.type),
                      }}
                    />
                  )}
                </TableCell>
                
                <TableCell sx={{ borderBottom: 'none' }}>
                  {formatAmount(Number(transaction.amount), transaction.currency, transaction.type)}
                </TableCell>
                
                <TableCell sx={{ borderBottom: 'none' }}>
                  {formatDate(transaction.date, transaction.time)}
                </TableCell>
                
                <TableCell sx={{ borderBottom: 'none' }}>
                  <Chip
                    label={transaction.status}
                    size="small"
                    color={getStatusColor(transaction.status) as any}
                    variant={transaction.status === 'confirmed' ? 'filled' : 'outlined'}
                  />
                </TableCell>
                
                <TableCell sx={{ borderBottom: 'none' }}>
                  <Typography variant="body2" color="text.secondary">
                    {transaction.merchantName || '-'}
                  </Typography>
                  {transaction.location && (
                    <Typography variant="caption" color="text.secondary">
                      {transaction.location}
                    </Typography>
                  )}
                </TableCell>
                
                <TableCell align="right" sx={{ borderBottom: 'none' }}>
                  <Tooltip title="More actions">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, transaction)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={state.total}
        page={state.page - 1}
        onPageChange={handlePageChange}
        rowsPerPage={state.limit}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={[10, 20, 50, 100]}
      />

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>

        {selectedTransaction?.status === 'pending' && (
          <MenuItem onClick={handleConfirm}>
            <ListItemIcon>
              <CheckIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Confirm</ListItemText>
          </MenuItem>
        )}

        {selectedTransaction?.status !== 'cancelled' && (
          <MenuItem onClick={handleCancel}>
            <ListItemIcon>
              <CancelIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Cancel</ListItemText>
          </MenuItem>
        )}

        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
};