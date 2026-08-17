import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import {
  contextApi,
  CreateContextData,
  FinancialContext,
  UpdateContextData,
} from '../services/contextApi';
import { useAuth } from './AuthContext';

const SELECTED_CONTEXT_KEY = 'financy_selected_context';

interface ContextsState {
  contexts: FinancialContext[];
  isLoading: boolean;
  error: string | null;
  /** undefined means "personal view": only the signed-in user's own records. */
  selectedContextId?: string;
}

interface ContextsValue extends ContextsState {
  selectedContext?: FinancialContext;
  reload: () => Promise<void>;
  selectContext: (contextId?: string) => void;
  createContext: (data: CreateContextData) => Promise<FinancialContext>;
  updateContext: (id: string, data: UpdateContextData) => Promise<FinancialContext>;
  deleteContext: (id: string) => Promise<void>;
  leaveContext: (id: string) => Promise<void>;
}

const ContextsContext = createContext<ContextsValue | null>(null);

const readStoredSelection = (): string | undefined =>
  localStorage.getItem(SELECTED_CONTEXT_KEY) || undefined;

export const ContextsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { state: authState } = useAuth();
  const isAuthenticated = authState.isAuthenticated;
  const [contexts, setContexts] = useState<FinancialContext[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedContextId, setSelectedContextId] = useState<string | undefined>(readStoredSelection);
  // Only a successfully loaded list may judge the stored selection — before
  // that, "not in the list" just means "the list hasn't arrived yet".
  const [hasLoaded, setHasLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (!isAuthenticated) {
      setContexts([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setContexts(await contextApi.list());
      setHasLoaded(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    reload();
  }, [reload]);

  // A context the user left or lost access to must not stay selected, or every
  // subsequent request would be rejected.
  useEffect(() => {
    if (!hasLoaded || isLoading || !selectedContextId) return;
    if (!contexts.some((context) => context.id === selectedContextId)) {
      setSelectedContextId(undefined);
      localStorage.removeItem(SELECTED_CONTEXT_KEY);
    }
  }, [contexts, hasLoaded, isLoading, selectedContextId]);

  const selectContext = useCallback((contextId?: string) => {
    setSelectedContextId(contextId);
    if (contextId) {
      localStorage.setItem(SELECTED_CONTEXT_KEY, contextId);
    } else {
      localStorage.removeItem(SELECTED_CONTEXT_KEY);
    }
  }, []);

  const createContext = useCallback(async (data: CreateContextData) => {
    const created = await contextApi.create(data);
    setContexts((current) => [...current, created]);
    return created;
  }, []);

  const updateContext = useCallback(async (id: string, data: UpdateContextData) => {
    const updated = await contextApi.update(id, data);
    setContexts((current) => current.map((context) => (context.id === id ? updated : context)));
    return updated;
  }, []);

  const forget = useCallback((id: string) => {
    setContexts((current) => current.filter((context) => context.id !== id));
    setSelectedContextId((current) => {
      if (current !== id) return current;
      localStorage.removeItem(SELECTED_CONTEXT_KEY);
      return undefined;
    });
  }, []);

  const deleteContext = useCallback(
    async (id: string) => {
      await contextApi.remove(id);
      forget(id);
    },
    [forget],
  );

  const leaveContext = useCallback(
    async (id: string) => {
      await contextApi.leave(id);
      forget(id);
    },
    [forget],
  );

  const value = useMemo<ContextsValue>(
    () => ({
      contexts,
      isLoading,
      error,
      selectedContextId,
      selectedContext: contexts.find((context) => context.id === selectedContextId),
      reload,
      selectContext,
      createContext,
      updateContext,
      deleteContext,
      leaveContext,
    }),
    [
      contexts,
      isLoading,
      error,
      selectedContextId,
      reload,
      selectContext,
      createContext,
      updateContext,
      deleteContext,
      leaveContext,
    ],
  );

  return <ContextsContext.Provider value={value}>{children}</ContextsContext.Provider>;
};

export const useFinancialContexts = (): ContextsValue => {
  const value = useContext(ContextsContext);

  if (!value) {
    throw new Error('useFinancialContexts must be used within a ContextsProvider');
  }

  return value;
};
