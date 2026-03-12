import { FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TransactionGroup } from '@/data/transactions';
import { exportGroupsToPDF, exportGroupsToExcel } from '@/lib/exportUtils';

interface ExportButtonsProps {
  groups: TransactionGroup[];
  disabled?: boolean;
}

export const ExportButtons = ({ groups, disabled }: ExportButtonsProps) => {
  const handleExportPDF = () => {
    if (groups.length === 0) return;
    exportGroupsToPDF(groups);
  };

  const handleExportExcel = () => {
    if (groups.length === 0) return;
    exportGroupsToExcel(groups);
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportPDF}
        disabled={disabled || groups.length === 0}
        className="rounded-full px-4 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all"
      >
        <FileText className="h-4 w-4 mr-2" />
        PDF
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportExcel}
        disabled={disabled || groups.length === 0}
        className="rounded-full px-4 hover:bg-income/10 hover:text-income hover:border-income/50 transition-all"
      >
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Excel
      </Button>
    </div>
  );
};
