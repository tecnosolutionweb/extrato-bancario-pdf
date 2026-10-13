import { useMemo } from 'react';
import { ChevronDown, TrendingUp, TrendingDown, Users } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Transaction, TransactionGroup, formatCurrency, formatDate, groupTransactionsByPayee } from '@/data/transactions';
import { cn } from '@/lib/utils';

interface TransactionGroupsProps {
  transactions: Transaction[];
}

export const TransactionGroups = ({ transactions }: TransactionGroupsProps) => {
  const groups = useMemo(() => groupTransactionsByPayee(transactions), [transactions]);

  const totals = useMemo(() => {
    const totalIncome = groups.reduce((sum, g) => sum + g.totalIncome, 0);
    const totalExpense = groups.reduce((sum, g) => sum + g.totalExpense, 0);
    return {
      totalIncome,
      totalExpense,
      netTotal: totalIncome - totalExpense,
      transactionCount: groups.reduce((sum, g) => sum + g.transactionCount, 0),
    };
  }, [groups]);

  if (groups.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-8 text-center shadow-card border border-border/50">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Nenhum grupo encontrado</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
      <Accordion type="multiple" className="w-full">
        {groups.map((group, index) => (
          <AccordionItem key={group.name} value={group.name} className="border-b border-border/50 last:border-b-0">
            <AccordionTrigger className="min-w-0 px-4 py-4 hover:bg-muted/50 hover:no-underline sm:px-6">
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-2 sm:pr-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                    group.netTotal >= 0 ? "bg-income-muted text-income" : "bg-expense-muted text-expense"
                  )}>
                    {group.name.charAt(0)}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-semibold text-foreground truncate">{group.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {group.transactionCount} {group.transactionCount === 1 ? 'transação' : 'transações'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                  {group.totalIncome > 0 && (
                    <div className="hidden items-center gap-1 text-income sm:flex">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm font-medium">+{formatCurrency(group.totalIncome)}</span>
                    </div>
                  )}
                  {group.totalExpense > 0 && (
                    <div className="hidden items-center gap-1 text-expense sm:flex">
                      <TrendingDown className="h-4 w-4" />
                      <span className="text-sm font-medium">-{formatCurrency(group.totalExpense)}</span>
                    </div>
                  )}
                  <div className={cn(
                    "font-bold text-base sm:text-lg text-right whitespace-nowrap sm:min-w-[120px]",
                    group.netTotal >= 0 ? "text-income" : "text-expense"
                  )}>
                    {group.netTotal >= 0 ? '+' : '-'}{formatCurrency(Math.abs(group.netTotal))}
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 sm:px-6">
              <div className="bg-muted/30 rounded-xl overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider sm:px-4">Data</th>
                      <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider sm:px-4">Descrição</th>
                      <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider sm:px-4">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-border/30 last:border-b-0 hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-2 text-sm text-muted-foreground whitespace-nowrap sm:px-4">
                          {formatDate(transaction.date)}
                        </td>
                        <td className="py-3 px-2 text-sm text-foreground break-words sm:px-4">
                          {transaction.description}
                        </td>
                        <td className={cn(
                          "py-3 px-2 text-sm font-medium text-right whitespace-nowrap sm:px-4",
                          transaction.type === 'income' ? 'text-income' : 'text-expense'
                        )}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.value))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="border-t border-border/50 bg-muted/50 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">Total Geral</p>
            <p className="text-xs text-muted-foreground">
              {groups.length} {groups.length === 1 ? 'beneficiário' : 'beneficiários'} • {totals.transactionCount}{' '}
              {totals.transactionCount === 1 ? 'transação' : 'transações'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-1 text-income">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">+{formatCurrency(totals.totalIncome)}</span>
            </div>
            <div className="flex items-center gap-1 text-expense">
              <TrendingDown className="h-4 w-4" />
              <span className="text-sm font-medium">-{formatCurrency(totals.totalExpense)}</span>
            </div>
            <div className={cn(
              "font-bold text-base sm:text-lg text-right whitespace-nowrap sm:min-w-[120px]",
              totals.netTotal >= 0 ? "text-income" : "text-expense"
            )}>
              {totals.netTotal >= 0 ? '+' : '-'}{formatCurrency(Math.abs(totals.netTotal))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
