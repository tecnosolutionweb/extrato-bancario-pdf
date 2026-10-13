import { pdfjsLib } from '@/lib/pdfjs';
import type { Transaction } from '@/data/transactions';
import { buildLines } from '@/lib/pdfLines';
import type { RawTextItem } from '@/lib/pdfLines';
import { extractTransactionsFromLines } from '@/lib/transactionExtractor';

export interface ParseResult {
  transactions: Transaction[];
  hasText: boolean;
}

export const isPasswordError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { name?: string }).name === 'PasswordException';

export const parsePDFToTransactions = async (
  file: File,
  password?: string,
): Promise<ParseResult> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, password }).promise;

  const lines: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    lines.push(...buildLines(textContent.items as unknown as RawTextItem[]));
  }

  return {
    transactions: extractTransactionsFromLines(lines),
    hasText: lines.length > 0,
  };
};
