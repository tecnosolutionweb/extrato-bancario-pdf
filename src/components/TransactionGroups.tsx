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
            <AccordionTrigger className="px-6 py-4 hover:bg-muted/50 hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold",
                    group.netTotal >= 0 ? "bg-income-muted text-income" : "bg-expense-muted text-expense"
                  )}>
                    {group.name.charAt(0)}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">{group.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {group.transactionCount} {group.transactionCount === 1 ? 'transação' : 'transações'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {group.totalIncome > 0 && (
                    <div className="flex items-center gap-1 text-income">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm font-medium">+{formatCurrency(group.totalIncome)}</span>
                    </div>
                  )}
                  {group.totalExpense > 0 && (
                    <div className="flex items-center gap-1 text-expense">
                      <TrendingDown className="h-4 w-4" />
                      <span className="text-sm font-medium">-{formatCurrency(group.totalExpense)}</span>
                    </div>
                  )}
                  <div className={cn(
                    "font-bold text-lg min-w-[120px] text-right",
                    group.netTotal >= 0 ? "text-income" : "text-expense"
                  )}>
                    {group.netTotal >= 0 ? '+' : '-'}{formatCurrency(Math.abs(group.netTotal))}
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              <div className="bg-muted/30 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Data</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Descrição</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-border/30 last:border-b-0 hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(transaction.date)}
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground">
                          {transaction.description}
                        </td>
                        <td className={cn(
                          "py-3 px-4 text-sm font-medium text-right whitespace-nowrap",
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
    </div>
  );
};
