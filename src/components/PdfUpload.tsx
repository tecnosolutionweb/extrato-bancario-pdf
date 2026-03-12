import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parsePDFToTransactions } from '@/lib/pdfParser';
import type { Transaction } from '@/data/transactions';
import { cn } from '@/lib/utils';

interface PdfUploadProps {
  onTransactionsLoaded: (transactions: Transaction[]) => void;
}

export const PdfUpload = ({ onTransactionsLoaded }: PdfUploadProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Por favor, selecione um arquivo PDF.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const transactions = await parsePDFToTransactions(file);
      
      if (transactions.length === 0) {
        setError('Não foi possível encontrar transações neste PDF. Verifique se é um extrato bancário válido.');
        return;
      }

      onTransactionsLoaded(transactions);
      setSuccess(`${transactions.length} transações importadas de "${file.name}"`);
    } catch (err) {
      console.error('Erro ao processar PDF:', err);
      setError('Erro ao processar o arquivo PDF. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-all duration-200",
          isDragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border/50 hover:border-primary/50 hover:bg-muted/30",
          isLoading && "pointer-events-none opacity-60"
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm font-medium text-muted-foreground">Processando extrato...</p>
          </>
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Upload className="h-7 w-7 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                Arraste seu extrato PDF aqui
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ou clique para selecionar um arquivo
              </p>
            </div>
            <Button variant="outline" size="sm" className="rounded-full mt-1">
              <FileText className="h-4 w-4 mr-2" />
              Selecionar PDF
            </Button>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-expense bg-expense-muted rounded-xl p-3 animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-sm text-income bg-income-muted rounded-xl p-3 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <p>{success}</p>
        </div>
      )}
    </div>
  );
};
