import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { buildLines } from './pdfLines';
import { extractTransactionsFromLines } from './transactionExtractor';
import { buildGroupsPdf, buildGroupsWorkbook } from './exportUtils';
import { parseSpreadsheetBuffer } from './spreadsheetParser';
import { groupTransactionsByPayee } from '@/data/transactions';
import type { Transaction } from '@/data/transactions';

const require = createRequire(import.meta.url);
(pdfjsLib as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
  require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');

const transactions: Transaction[] = [
  { id: '1', date: '2026-10-05', description: 'PIX TRANSF JOAO DA SILVA', value: 1000, type: 'income' },
  { id: '2', date: '2026-10-03', description: 'PAG BOLETO ENERGIA', value: -250, type: 'expense' },
  { id: '3', date: '2026-10-01', description: 'TARIFA PACOTE', value: -35, type: 'expense' },
];

const groups = groupTransactionsByPayee(transactions);

const parsePdf = async (bytes: Uint8Array): Promise<Transaction[]> => {
  const pdf = await pdfjsLib.getDocument({
    data: bytes,
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;

  const lines: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    lines.push(...buildLines(content.items as never));
  }

  return extractTransactionsFromLines(lines);
};

describe('export round-trip', () => {
  it('reimporta transações do PDF gerado', async () => {
    const bytes = new Uint8Array(buildGroupsPdf(groups).output('arraybuffer'));
    const parsed = await parsePdf(bytes);

    expect(parsed).toHaveLength(3);
    expect(parsed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ date: '2026-10-05', value: 1000, type: 'income' }),
        expect.objectContaining({ date: '2026-10-03', value: -250, type: 'expense' }),
        expect.objectContaining({ date: '2026-10-01', value: -35, type: 'expense' }),
      ]),
    );
  });

  it('reimporta transações do Excel gerado', () => {
    const workbook = buildGroupsWorkbook(groups);
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const parsed = parseSpreadsheetBuffer(new Uint8Array(buffer));

    expect(parsed).toHaveLength(3);
    expect(parsed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ date: '2026-10-05', value: 1000, type: 'income' }),
        expect.objectContaining({ date: '2026-10-03', value: -250, type: 'expense' }),
        expect.objectContaining({ date: '2026-10-01', value: -35, type: 'expense' }),
      ]),
    );
  });
});
