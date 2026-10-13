import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Wallet, Receipt, Upload, PieChart } from 'lucide-react';
import { Transaction, formatCurrency, groupTransactionsByPayee } from '@/data/transactions';
import { SummaryCard } from '@/components/SummaryCard';
import { TransactionFilters, FilterType, ViewMode } from '@/components/TransactionFilters';
import { TransactionTable } from '@/components/TransactionTable';
import { TransactionGroups } from '@/components/TransactionGroups';
import { PdfUpload } from '@/components/PdfUpload';
import { InstallPrompt } from '@/components/InstallPrompt';
import { useTransactions } from '@/contexts/TransactionsContext';
import logo from '@/assets/logo.png';

const Index = () => {
  const { transactions, addTransactions, clearTransactions } = useTransactions();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleTransactionsLoaded = (newTransactions: Transaction[]) => {
    addTransactions(newTransactions);
  };

  const handleClearTransactions = () => {
    clearTransactions();
    setSearchTerm('');
    setFilterType('all');
    setStartDate('');
    setEndDate('');
  };

  const handleClearDates = () => {
    setStartDate('');
    setEndDate('');
  };

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
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const matchesSearch = searchTerm === '' || 
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || transaction.type === filterType;
      const matchesStartDate = !startDate || transaction.date >= startDate;
      const matchesEndDate = !endDate || transaction.date <= endDate;
      return matchesSearch && matchesType && matchesStartDate && matchesEndDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, filterType, startDate, endDate]);

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

  // Get period label
  const periodLabel = useMemo(() => {
    if (transactions.length === 0) return 'Sem dados';
    const dates = transactions.map(t => new Date(t.date));
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    return `${fmt(min)} - ${fmt(max)}`;
  }, [transactions]);

  const transactionCount = filteredTransactions.length;
  const incomeCount = filteredTransactions.filter(t => t.type === 'income').length;
  const expenseCount = filteredTransactions.filter(t => t.type === 'expense').length;

  return (
    <div className="min-h-screen bg-background">
      <InstallPrompt />
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 sm:py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Extrato Banco" className="h-10 w-10 rounded-xl" />
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-foreground">Extrato Banco</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">{periodLabel}</p>
                </div>
              </div>
              <Link
                to="/graficos"
                className="flex items-center gap-2 rounded-xl border border-border/50 bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <PieChart className="h-4 w-4 text-primary" />
                <span className="hidden sm:inline">Gráficos</span>
              </Link>
            </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8 pb-20">
        {/* PDF Upload */}
        <section className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Importar Extrato</h2>
            </div>
            {transactions.length > 0 && (
              <button
                onClick={handleClearTransactions}
                className="text-sm text-muted-foreground hover:text-expense transition-colors"
              >
                Limpar tudo
              </button>
            )}
          </div>
          <PdfUpload onTransactionsLoaded={handleTransactionsLoaded} />
        </section>

        {transactions.length > 0 && (
          <>
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
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onClearDates={handleClearDates}
              />
              
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
                {(startDate || endDate) && (
                  <span>
                    • Período:{' '}
                    <strong className="text-foreground">
                      {startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'início'} até{' '}
                      {endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'agora'}
                    </strong>
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
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
