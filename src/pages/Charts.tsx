import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowLeft,
  Upload,
  BarChart3,
  CalendarDays,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SummaryCard } from '@/components/SummaryCard';
import {
  extractPayeeName,
  formatCurrency,
} from '@/data/transactions';
import { useTransactions } from '@/contexts/TransactionsContext';
import logo from '@/assets/logo.png';

const chartConfig = {
  income: { label: 'Entradas', color: 'hsl(var(--chart-income))' },
  expense: { label: 'Gastos', color: 'hsl(var(--chart-expense))' },
} satisfies ChartConfig;

const formatMonth = (key: string) => {
  const [year, month] = key.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
};

const Charts = () => {
  const { transactions } = useTransactions();

  const { totalIncome, totalExpense, balance } = useMemo(() => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.value, 0);
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.value), 0);
    return { totalIncome: income, totalExpense: expense, balance: income - expense };
  }, [transactions]);

  const pieData = useMemo(
    () => [
      { key: 'income', name: 'Entradas', value: totalIncome },
      { key: 'expense', name: 'Gastos', value: totalExpense },
    ],
    [totalIncome, totalExpense],
  );

  const monthlyData = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    transactions.forEach(t => {
      const key = t.date.slice(0, 7);
      const entry = map.get(key) ?? { income: 0, expense: 0 };
      if (t.type === 'income') {
        entry.income += t.value;
      } else {
        entry.expense += Math.abs(t.value);
      }
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({
        month: key,
        label: formatMonth(key),
        income: value.income,
        expense: value.expense,
      }));
  }, [transactions]);

  const balanceLineData = useMemo(() => {
    let running = 0;
    return monthlyData.map(m => {
      running += m.income - m.expense;
      return { label: m.label, balance: running };
    });
  }, [monthlyData]);

  const topExpenses = useMemo(() => {
    const map = new Map<string, number>();
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const name = extractPayeeName(t.description);
        map.set(name, (map.get(name) ?? 0) + Math.abs(t.value));
      });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [transactions]);

  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Extrato Banco" className="h-10 w-10 rounded-xl" />
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-foreground">Gráficos</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Entradas e gastos do período
                </p>
              </div>
            </div>
            <Link
              to="/"
              className="flex items-center gap-2 rounded-xl border border-border/50 bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border/50 bg-card p-12 text-center shadow-card">
            <PieChartIcon className="h-12 w-12 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Nenhuma transação importada</h2>
              <p className="text-sm text-muted-foreground">
                Importe um extrato em PDF para visualizar os gráficos.
              </p>
            </div>
            <Link
              to="/"
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Upload className="h-4 w-4" />
              Importar extrato
            </Link>
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                title="Total de Entradas"
                value={formatCurrency(totalIncome)}
                icon={TrendingUp}
                variant="income"
                subtitle={`${transactions.filter(t => t.type === 'income').length} transações`}
              />
              <SummaryCard
                title="Total de Gastos"
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
                title="Taxa de Poupança"
                value={`${savingsRate}%`}
                icon={PiggyBank}
                variant="balance"
                subtitle="Da renda que sobrou"
              />
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/50 shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <PieChartIcon className="h-5 w-5 text-primary" />
                    Entradas x Gastos
                  </CardTitle>
                  <CardDescription>Proporção entre o que entrou e o que saiu</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[320px]">
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={value => formatCurrency(Number(value))}
                          />
                        }
                      />
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={70}
                        strokeWidth={4}
                      >
                        {pieData.map(entry => (
                          <Cell key={entry.key} fill={`var(--color-${entry.key})`} />
                        ))}
                      </Pie>
                      <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Entradas e Gastos por Mês
                  </CardTitle>
                  <CardDescription>Comparativo mensal do período</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="max-h-[320px] w-full">
                    <BarChart data={monthlyData}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        width={72}
                        tickFormatter={value => formatCurrency(Number(value)).replace('R$', '').trim()}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={value => formatCurrency(Number(value))}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Evolução do Saldo
                  </CardTitle>
                  <CardDescription>Saldo acumulado mês a mês</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{ balance: { label: 'Saldo', color: 'hsl(var(--primary))' } }}
                    className="max-h-[320px] w-full"
                  >
                    <LineChart data={balanceLineData}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        width={72}
                        tickFormatter={value => formatCurrency(Number(value)).replace('R$', '').trim()}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={value => formatCurrency(Number(value))}
                          />
                        }
                      />
                      <Line
                        dataKey="balance"
                        type="monotone"
                        stroke="var(--color-balance)"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingDown className="h-5 w-5 text-expense" />
                    Maiores Gastos
                  </CardTitle>
                  <CardDescription>Top 8 destinos das suas saídas</CardDescription>
                </CardHeader>
                <CardContent>
                  {topExpenses.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum gasto registrado.
                    </p>
                  ) : (
                    <ChartContainer
                      config={{ value: { label: 'Gasto', color: 'hsl(var(--chart-expense))' } }}
                      className="max-h-[320px] w-full"
                    >
                      <BarChart
                        data={topExpenses}
                        layout="vertical"
                        margin={{ left: 8, right: 16 }}
                      >
                        <CartesianGrid horizontal={false} />
                        <XAxis
                          type="number"
                          hide
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          width={130}
                          tickFormatter={value => {
                            const str = String(value);
                            return str.length > 18 ? `${str.slice(0, 18)}…` : str;
                          }}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={value => formatCurrency(Number(value))}
                            />
                          }
                        />
                        <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Charts;
