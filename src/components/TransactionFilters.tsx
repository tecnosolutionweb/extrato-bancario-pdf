import { Search, Filter, ArrowUpCircle, ArrowDownCircle, LayoutList, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { TransactionGroup } from '@/data/transactions';
import { ExportButtons } from './ExportButtons';

export type FilterType = 'all' | 'income' | 'expense';
export type ViewMode = 'list' | 'groups';

interface TransactionFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterType: FilterType;
  onFilterChange: (type: FilterType) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  groups?: TransactionGroup[];
}

export const TransactionFilters = ({
  searchTerm,
  onSearchChange,
  filterType,
  onFilterChange,
  viewMode,
  onViewModeChange,
  groups = [],
}: TransactionFiltersProps) => {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* View Mode Toggle and Export Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && onViewModeChange(value as ViewMode)}
          className="bg-muted/50 p-1 rounded-xl"
        >
          <ToggleGroupItem
            value="list"
            aria-label="Visualização em lista"
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-all data-[state=on]:bg-background data-[state=on]:shadow-sm",
            )}
          >
            <LayoutList className="h-4 w-4 mr-2" />
            Lista
          </ToggleGroupItem>
          <ToggleGroupItem
            value="groups"
            aria-label="Visualização por beneficiário"
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-all data-[state=on]:bg-background data-[state=on]:shadow-sm",
            )}
          >
            <Users className="h-4 w-4 mr-2" />
            Por Beneficiário
          </ToggleGroupItem>
        </ToggleGroup>
        
        {/* Export Buttons - only show when in groups view */}
        {viewMode === 'groups' && (
          <ExportButtons groups={groups} />
        )}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou descrição..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-11 h-12 bg-card border-border/50 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground mr-2">Filtrar:</span>
        
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFilterChange('all')}
            className={cn(
              "rounded-full px-4 transition-all",
              filterType === 'all' 
                ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90" 
                : "hover:bg-muted"
            )}
          >
            <LayoutList className="h-4 w-4 mr-2" />
            Todos
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFilterChange('income')}
            className={cn(
              "rounded-full px-4 transition-all",
              filterType === 'income' 
                ? "bg-income text-income-foreground border-income hover:bg-income/90" 
                : "hover:bg-income-muted hover:text-income hover:border-income/50"
            )}
          >
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            Entradas
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFilterChange('expense')}
            className={cn(
              "rounded-full px-4 transition-all",
              filterType === 'expense' 
                ? "bg-expense text-expense-foreground border-expense hover:bg-expense/90" 
                : "hover:bg-expense-muted hover:text-expense hover:border-expense/50"
            )}
          >
            <ArrowDownCircle className="h-4 w-4 mr-2" />
            Saídas
          </Button>
        </div>
      </div>
    </div>
  );
};
