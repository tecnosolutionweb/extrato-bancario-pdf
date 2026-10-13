import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { Transaction } from '@/data/transactions';

interface TransactionsContextValue {
  transactions: Transaction[];
  addTransactions: (newTransactions: Transaction[]) => void;
  clearTransactions: () => void;
}

const TransactionsContext = createContext<TransactionsContextValue | null>(null);

export const TransactionsProvider = ({ children }: { children: ReactNode }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const addTransactions = useCallback((newTransactions: Transaction[]) => {
    setTransactions(prev => {
      const merged = [...prev, ...newTransactions];
      return merged.map((t, i) => ({ ...t, id: String(i + 1) }));
    });
  }, []);

  const clearTransactions = useCallback(() => {
    setTransactions([]);
  }, []);

  const value = useMemo(
    () => ({ transactions, addTransactions, clearTransactions }),
    [transactions, addTransactions, clearTransactions],
  );

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
};

export const useTransactions = (): TransactionsContextValue => {
  const context = useContext(TransactionsContext);
  if (!context) {
    throw new Error('useTransactions must be used within a <TransactionsProvider />');
  }
  return context;
};
