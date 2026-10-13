import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { parsePDFToTransactions, isPasswordError } from '@/lib/pdfParser';
import { ocrFileToLines, isImageFile, OcrProgress } from '@/lib/ocr';
import { extractTransactionsFromLines } from '@/lib/transactionExtractor';
import type { Transaction } from '@/data/transactions';
import { cn } from '@/lib/utils';

interface PdfUploadProps {
  onTransactionsLoaded: (transactions: Transaction[]) => void;
}

const isPdfFile = (file: File): boolean =>
  file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

export const PdfUpload = ({ onTransactionsLoaded }: PdfUploadProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File, filePassword?: string) => {
    const isPdf = isPdfFile(file);
    const isImage = isImageFile(file);

    if (!isPdf && !isImage) {
      setError('Selecione um arquivo PDF ou uma imagem (PNG, JPG, WEBP...).');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setProgress(null);

    try {
      let transactions: Transaction[] = [];
      let usedOcr = false;

      if (isPdf) {
        const { transactions: textTransactions, hasText } = await parsePDFToTransactions(file, filePassword);
        transactions = textTransactions;

        if (transactions.length === 0 && !hasText) {
          setProgress({ page: 0, totalPages: 0, progress: 0, label: 'Preparando OCR...' });
          const lines = await ocrFileToLines(file, filePassword, setProgress);
          transactions = extractTransactionsFromLines(lines);
          usedOcr = true;
        } else if (transactions.length === 0) {
          setError('Não foi possível encontrar transações neste PDF. Verifique se é um extrato bancário válido.');
          return;
        }
      } else {
        setProgress({ page: 0, totalPages: 0, progress: 0, label: 'Preparando OCR...' });
        const lines = await ocrFileToLines(file, undefined, setProgress);
        transactions = extractTransactionsFromLines(lines);
        usedOcr = true;
      }

      if (transactions.length === 0) {
        setError('Não foi possível encontrar transações neste arquivo. Verifique se é um extrato bancário válido.');
        return;
      }

      setNeedsPassword(false);
      setPassword('');
      setPendingFile(null);
      onTransactionsLoaded(transactions);
      setSuccess(
        `${transactions.length} transações importadas de "${file.name}"${
          usedOcr ? ' (via OCR — confira os valores)' : ''
        }`,
      );
    } catch (err) {
      if (isPasswordError(err)) {
        setNeedsPassword(true);
        setPendingFile(file);
        setError(filePassword ? 'Senha incorreta. Tente novamente.' : null);
      } else {
        console.error('Erro ao processar arquivo:', err);
        setError('Erro ao processar o arquivo. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
      setProgress(null);
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
        accept=".pdf,image/*"
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
            <p className="text-sm font-medium text-muted-foreground">
              {progress?.label ?? 'Processando extrato...'}
            </p>
            {progress && progress.progress > 0 && (
              <p className="text-xs text-muted-foreground">{Math.round(progress.progress * 100)}%</p>
            )}
          </>
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Upload className="h-7 w-7 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                Arraste seu extrato (PDF ou imagem) aqui
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ou clique para selecionar um arquivo
              </p>
            </div>
            <Button variant="outline" size="sm" className="rounded-full mt-1">
              <FileText className="h-4 w-4 mr-2" />
              Selecionar arquivo
            </Button>
          </>
        )}
      </div>

      {needsPassword && (
        <form
          className="rounded-2xl border border-border/50 p-4 space-y-3 animate-fade-in"
          onSubmit={(e) => {
            e.preventDefault();
            if (pendingFile && password) handleFile(pendingFile, password);
          }}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4 shrink-0" />
            <p>Este PDF é protegido por senha. Digite a senha para desbloqueá-lo.</p>
          </div>
          <div className="flex gap-2">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha do PDF"
              autoFocus
            />
            <Button type="submit" disabled={isLoading || !password}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Desbloquear'}
            </Button>
          </div>
        </form>
      )}

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
