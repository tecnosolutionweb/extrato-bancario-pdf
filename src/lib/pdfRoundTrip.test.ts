import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { buildLines } from './pdfLines';
import { extractTransactionsFromLines } from './transactionExtractor';

const require = createRequire(import.meta.url);
(pdfjsLib as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
  require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');

describe('PDF round-trip', () => {
  it('lê transações de um PDF gerado', async () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const rows = [
      ['01/03/2024', 'PIX TRANSF JOAO', '1.000,00', '5.000,00'],
      ['02/03/2024', 'PAG BOLETO ENERGIA', '250,00', '4.750,00'],
      ['', 'PIX RECEBIDO MARIA', '300,00', '5.050,00'],
      ['03/03/2024', 'TARIFA PACOTE', '-35,00', '5.015,00'],
    ];

    let y = 60;
    for (const r of rows) {
      doc.text(r[0], 40, y);
      doc.text(r[1], 140, y);
      doc.text(r[2], 400, y);
      doc.text(r[3], 480, y);
      y += 18;
    }

    const data = new Uint8Array(doc.output('arraybuffer'));
    const pdf = await pdfjsLib.getDocument({
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
    }).promise;

    const page = await pdf.getPage(1);
    const content = await page.getTextContent();
    const lines = buildLines(content.items as never);
    const transactions = extractTransactionsFromLines(lines);

    expect(transactions).toHaveLength(4);
    expect(transactions[0]).toMatchObject({ date: '2024-03-01', value: 1000, type: 'income' });
    expect(transactions[1]).toMatchObject({ value: -250, type: 'expense' });
    expect(transactions[2]).toMatchObject({ date: '2024-03-02', value: 300 });
    expect(transactions[3]).toMatchObject({ date: '2024-03-03', value: -35 });
  });
});
