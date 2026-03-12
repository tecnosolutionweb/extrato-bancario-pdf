export interface Transaction {
  id: string;
  date: string;
  description: string;
  value: number;
  type: 'income' | 'expense';
}

// Helper functions
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Math.abs(value));
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00');
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

export const extractPayeeName = (description: string): string => {
  const match = description.match(/(?:PIX TRANSF|PIX QRS|TED|PAY|PAG BOLETO|SISPAG PIX)\s*(.+)/i);
  if (match) {
    return match[1].trim().toUpperCase();
  }
  return description.toUpperCase();
};

export const getUniqueNames = (transactions: Transaction[]): string[] => {
  const names = new Set<string>();
  transactions.forEach(t => {
    names.add(extractPayeeName(t.description));
  });
  return Array.from(names).sort();
};

export interface TransactionGroup {
  name: string;
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
  netTotal: number;
  transactionCount: number;
}

export const groupTransactionsByPayee = (transactionList: Transaction[]): TransactionGroup[] => {
  const groups = new Map<string, Transaction[]>();
  
  transactionList.forEach(transaction => {
    const name = extractPayeeName(transaction.description);
    if (!groups.has(name)) {
      groups.set(name, []);
    }
    groups.get(name)!.push(transaction);
  });
  
  const result: TransactionGroup[] = [];
  
  groups.forEach((transactions, name) => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.value, 0);
    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.value), 0);
    
    result.push({
      name,
      transactions: transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      totalIncome,
      totalExpense,
      netTotal: totalIncome - totalExpense,
      transactionCount: transactions.length,
    });
  });
  
  return result.sort((a, b) => Math.abs(b.netTotal) - Math.abs(a.netTotal));
};
