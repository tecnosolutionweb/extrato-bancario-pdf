import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Transaction, formatCurrency, formatDate } from '@/data/transactions';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TransactionTableProps {
  transactions: Transaction[];
}

export const TransactionTable = ({ transactions }: TransactionTableProps) => {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <div className="rounded-full bg-muted p-4 mb-4">
          <ArrowUpCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Nenhuma transação encontrada</h3>
        <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros de busca</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-card animate-slide-up">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold text-foreground">Data</TableHead>
            <TableHead className="font-semibold text-foreground">Descrição</TableHead>
            <TableHead className="font-semibold text-foreground text-right">Valor</TableHead>
            <TableHead className="font-semibold text-foreground text-center w-24">Tipo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction, index) => (
            <TableRow 
              key={transaction.id}
              className="transition-colors hover:bg-muted/30"
              style={{ animationDelay: `${index * 20}ms` }}
            >
              <TableCell className="font-medium text-muted-foreground">
                {formatDate(transaction.date)}
              </TableCell>
              <TableCell className="max-w-[300px] truncate font-medium">
                {transaction.description}
              </TableCell>
              <TableCell className={cn(
                "text-right font-bold tabular-nums",
                transaction.type === 'income' ? "text-income" : "text-expense"
              )}>
                {transaction.type === 'income' ? '+ ' : '- '}
                {formatCurrency(transaction.value)}
              </TableCell>
              <TableCell className="text-center">
                <div className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                  transaction.type === 'income' 
                    ? "bg-income-muted text-income" 
                    : "bg-expense-muted text-expense"
                )}>
                  {transaction.type === 'income' ? (
                    <>
                      <ArrowUpCircle className="h-3 w-3" />
                      Entrada
                    </>
                  ) : (
                    <>
                      <ArrowDownCircle className="h-3 w-3" />
                      Saída
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
