import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, Calendar, Receipt } from 'lucide-react';
import { transactions, formatCurrency, groupTransactionsByPayee } from '@/data/transactions';
import { SummaryCard } from '@/components/SummaryCard';
import { TransactionFilters, FilterType, ViewMode } from '@/components/TransactionFilters';
import { TransactionTable } from '@/components/TransactionTable';
import { TransactionGroups } from '@/components/TransactionGroups';

const Index = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Calculate totals
  const { totalIncome, totalExpense, balance } = useMemo(() => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.value, 0);
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.value), 0);
    
    return {
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
    };
  }, []);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Type filter
      const matchesType = filterType === 'all' || transaction.type === filterType;
      
      return matchesSearch && matchesType;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [searchTerm, filterType]);

  // Get filtered totals
  const filteredTotals = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.value, 0);
    const expense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.value), 0);
    
    return { income, expense };
  }, [filteredTransactions]);

  // Get groups for export
  const filteredGroups = useMemo(() => {
    return groupTransactionsByPayee(filteredTransactions);
  }, [filteredTransactions]);

  // Transaction count
  const transactionCount = filteredTransactions.length;
  const incomeCount = filteredTransactions.filter(t => t.type === 'income').length;
  const expenseCount = filteredTransactions.filter(t => t.type === 'expense').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <Wallet className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Controle Financeiro</h1>
                <p className="text-sm text-muted-foreground">Eduardo de Medeiros</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Nov 2025 - Fev 2026</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Summary Cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Total de Entradas"
            value={formatCurrency(totalIncome)}
            icon={TrendingUp}
            variant="income"
            subtitle={`${transactions.filter(t => t.type === 'income').length} transações`}
          />
          <SummaryCard
            title="Total de Saídas"
            value={formatCurrency(totalExpense)}
            icon={TrendingDown}
            variant="expense"
            subtitle={`${transactions.filter(t => t.type === 'expense').length} transações`}
          />
          <SummaryCard
            title="Saldo do Período"
            value={`${balance >= 0 ? '+' : '-'} ${formatCurrency(balance)}`}
            icon={Wallet}
            variant="balance"
            subtitle={balance >= 0 ? 'Positivo' : 'Negativo'}
          />
          <SummaryCard
            title="Total de Transações"
            value={transactions.length.toString()}
            icon={Receipt}
            variant="balance"
            subtitle="No período"
          />
        </section>

        {/* Filters */}
        <section className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
          <h2 className="text-lg font-semibold text-foreground mb-4">Transações</h2>
          <TransactionFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterType={filterType}
            onFilterChange={setFilterType}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            groups={filteredGroups}
          />
          
          {/* Filter results info */}
          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              Mostrando <strong className="text-foreground">{transactionCount}</strong> transações
            </span>
            {filterType !== 'all' && (
              <span>
                • {filterType === 'income' ? 'Entradas' : 'Saídas'}: {formatCurrency(filterType === 'income' ? filteredTotals.income : filteredTotals.expense)}
              </span>
            )}
            {searchTerm && (
              <span>
                • Filtrado por: <strong className="text-foreground">"{searchTerm}"</strong>
              </span>
            )}
          </div>
        </section>

        {/* Transaction View */}
        <section>
          {viewMode === 'list' ? (
            <TransactionTable transactions={filteredTransactions} />
          ) : (
            <TransactionGroups transactions={filteredTransactions} />
          )}
        </section>

        {/* Footer Stats */}
        {filterType === 'all' && (
          <section className="grid gap-4 sm:grid-cols-2 animate-fade-in">
            <div className="bg-income-muted rounded-xl p-4 border border-income/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-income font-medium">Entradas Filtradas</p>
                  <p className="text-2xl font-bold text-income">{formatCurrency(filteredTotals.income)}</p>
                </div>
                <div className="text-income">
                  <TrendingUp className="h-8 w-8 opacity-50" />
                </div>
              </div>
              <p className="text-xs text-income/70 mt-2">{incomeCount} transações de entrada</p>
            </div>
            
            <div className="bg-expense-muted rounded-xl p-4 border border-expense/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-expense font-medium">Saídas Filtradas</p>
                  <p className="text-2xl font-bold text-expense">{formatCurrency(filteredTotals.expense)}</p>
                </div>
                <div className="text-expense">
                  <TrendingDown className="h-8 w-8 opacity-50" />
                </div>
              </div>
              <p className="text-xs text-expense/70 mt-2">{expenseCount} transações de saída</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Index;
