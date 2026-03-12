import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  variant: 'income' | 'expense' | 'balance';
  subtitle?: string;
}

export const SummaryCard = ({ title, value, icon: Icon, variant, subtitle }: SummaryCardProps) => {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-6 shadow-card transition-all duration-300 hover:shadow-card-hover animate-slide-up",
      variant === 'income' && "bg-card border border-income/20",
      variant === 'expense' && "bg-card border border-expense/20",
      variant === 'balance' && "bg-card border border-primary/20"
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={cn(
            "text-2xl font-bold tracking-tight",
            variant === 'income' && "text-income",
            variant === 'expense' && "text-expense",
            variant === 'balance' && "text-foreground"
          )}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl",
          variant === 'income' && "bg-income-muted",
          variant === 'expense' && "bg-expense-muted",
          variant === 'balance' && "bg-primary/10"
        )}>
          <Icon className={cn(
            "h-6 w-6",
            variant === 'income' && "text-income",
            variant === 'expense' && "text-expense",
            variant === 'balance' && "text-primary"
          )} />
        </div>
      </div>
      
      {/* Decorative gradient */}
      <div className={cn(
        "absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl",
        variant === 'income' && "bg-income",
        variant === 'expense' && "bg-expense",
        variant === 'balance' && "bg-primary"
      )} />
    </div>
  );
};
