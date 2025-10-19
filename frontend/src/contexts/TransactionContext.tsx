import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import {
  Transaction,
  CreateTransactionData,
  UpdateTransactionData,
  TransactionFilters,
  PaginatedTransactions,
  transactionApi,
} from '../services/transactionApi';

interface TransactionState {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netAmount: number;
    transactionCount: number;
    categories: Array<{
      category: string;
      amount: number;
      count: number;
      percentage: number;
    }>;
  };
  isLoading: boolean;
  error: string | null;
  filters: TransactionFilters;
  categories: string[];
  merchants: string[];
}

type TransactionAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TRANSACTIONS'; payload: PaginatedTransactions }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'REMOVE_TRANSACTION'; payload: string }
  | { type: 'SET_FILTERS'; payload: TransactionFilters }
  | { type: 'SET_CATEGORIES'; payload: string[] }
  | { type: 'SET_MERCHANTS'; payload: string[] };

const TransactionContext = createContext<{
  state: TransactionState;
  loadTransactions: (filters?: TransactionFilters) => Promise<void>;
  createTransaction: (data: CreateTransactionData) => Promise<Transaction>;
  updateTransaction: (id: string, data: UpdateTransactionData) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  confirmTransaction: (id: string) => Promise<Transaction>;
  cancelTransaction: (id: string) => Promise<Transaction>;
  setFilters: (filters: TransactionFilters) => void;
  loadCategories: () => Promise<void>;
  loadMerchants: () => Promise<void>;
} | null>(null);

const initialState: TransactionState = {
  transactions: [],
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
  summary: {
    totalIncome: 0,
    totalExpenses: 0,
    netAmount: 0,
    transactionCount: 0,
    categories: [],
  },
  isLoading: false,
  error: null,
  filters: {
    page: 1,
    limit: 20,
    sortBy: 'date',
    sortOrder: 'DESC',
  },
  categories: [],
  merchants: [],
};

const transactionReducer = (state: TransactionState, action: TransactionAction): TransactionState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_TRANSACTIONS':
      return {
        ...state,
        transactions: action.payload.transactions,
        total: action.payload.total,
        page: action.payload.page,
        limit: action.payload.limit,
        totalPages: action.payload.totalPages,
        summary: action.payload.summary,
        isLoading: false,
        error: null,
      };
    case 'ADD_TRANSACTION':
      return {
        ...state,
        transactions: [action.payload, ...state.transactions],
        total: state.total + 1,
      };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map(t =>
          t.id === action.payload.id ? action.payload : t
        ),
      };
    case 'REMOVE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.filter(t => t.id !== action.payload),
        total: state.total - 1,
      };
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    case 'SET_MERCHANTS':
      return { ...state, merchants: action.payload };
    default:
      return state;
  }
};

export const TransactionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(transactionReducer, initialState);

  const loadTransactions = async (filters?: TransactionFilters) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const appliedFilters = { ...state.filters, ...filters };
      const result = await transactionApi.getTransactions(appliedFilters);

      dispatch({ type: 'SET_TRANSACTIONS', payload: result });
      if (filters) {
        dispatch({ type: 'SET_FILTERS', payload: filters });
      }
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || 'Failed to load transactions' });
    }
  };

  const createTransaction = async (data: CreateTransactionData): Promise<Transaction> => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      const transaction = await transactionApi.createTransaction(data);
      dispatch({ type: 'ADD_TRANSACTION', payload: transaction });
      return transaction;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to create transaction';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const updateTransaction = async (id: string, data: UpdateTransactionData): Promise<Transaction> => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      const transaction = await transactionApi.updateTransaction(id, data);
      dispatch({ type: 'UPDATE_TRANSACTION', payload: transaction });
      return transaction;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update transaction';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const deleteTransaction = async (id: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      await transactionApi.deleteTransaction(id);
      dispatch({ type: 'REMOVE_TRANSACTION', payload: id });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete transaction';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const confirmTransaction = async (id: string): Promise<Transaction> => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      const transaction = await transactionApi.confirmTransaction(id);
      dispatch({ type: 'UPDATE_TRANSACTION', payload: transaction });
      return transaction;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to confirm transaction';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const cancelTransaction = async (id: string): Promise<Transaction> => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      const transaction = await transactionApi.cancelTransaction(id);
      dispatch({ type: 'UPDATE_TRANSACTION', payload: transaction });
      return transaction;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to cancel transaction';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw new Error(errorMessage);
    }
  };

  const setFilters = (filters: TransactionFilters) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  };

  const loadCategories = async () => {
    try {
      const categories = await transactionApi.getCategories();
      dispatch({ type: 'SET_CATEGORIES', payload: categories });
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadMerchants = async () => {
    try {
      const merchants = await transactionApi.getMerchants();
      dispatch({ type: 'SET_MERCHANTS', payload: merchants });
    } catch (error) {
      console.error('Failed to load merchants:', error);
    }
  };

  return (
    <TransactionContext.Provider
      value={{
        state,
        loadTransactions,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        confirmTransaction,
        cancelTransaction,
        setFilters,
        loadCategories,
        loadMerchants,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
};