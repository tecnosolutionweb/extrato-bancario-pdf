import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { TransactionGroup, formatCurrency, formatDate, extractPayeeName } from '@/data/transactions';

const buildSummaryRows = (groups: TransactionGroup[]) => {
  const totalIncome = groups.reduce((sum, g) => sum + g.totalIncome, 0);
  const totalExpense = groups.reduce((sum, g) => sum + g.totalExpense, 0);
  const totalNet = groups.reduce((sum, g) => sum + g.netTotal, 0);
  const totalCount = groups.reduce((sum, g) => sum + g.transactionCount, 0);

  const rows = groups.map(g => [
    g.name,
    g.transactionCount.toString(),
    formatCurrency(g.totalIncome),
    formatCurrency(g.totalExpense),
    formatCurrency(g.netTotal),
  ]);

  rows.push([
    'TOTAL GERAL',
    totalCount.toString(),
    formatCurrency(totalIncome),
    formatCurrency(totalExpense),
    formatCurrency(totalNet),
  ]);

  return rows;
};

const sortTransactions = (groups: TransactionGroup[]) =>
  groups
    .flatMap(g => g.transactions)
    .sort((a, b) => b.date.localeCompare(a.date));

const signedCurrency = (value: number) =>
  `${value < 0 ? '-' : ''}${formatCurrency(value)}`;

// jsPDF throws "Cannot read properties of undefined" on empty groups
const LONG_DATE = { day: '2-digit', month: 'long', year: 'numeric' } as const;

/**
 * Builds the beneficiary report PDF.
 *
 * The document is intentionally structured so it can be re-imported by the app:
 * - every transaction is written as "Data  Descrição  Valor" on a single text
 *   line, which `buildLines` + `extractTransactionsFromLines` can parse back;
 * - the header only uses a textual date (no "dd/mm/yyyy") and the summary table
 *   (names + amounts, no dates) comes before the ledger, so the parser never
 *   mistakes summary rows for transactions.
 */
export const buildGroupsPdf = (groups: TransactionGroup[]): jsPDF => {
  const doc = new jsPDF();
  const now = new Date().toLocaleDateString('pt-BR', LONG_DATE);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Relatório de Transações por Beneficiário', 14, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(110);
  doc.text(`Gerado em ${now}`, 14, 27);

  // Summary table (no dates -> ignored by the importer)
  autoTable(doc, {
    startY: 34,
    head: [['Beneficiário', 'Qtd', 'Entradas', 'Saídas', 'Saldo']],
    body: buildSummaryRows(groups),
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.row.index === groups.length) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [226, 232, 240];
      }
    },
  });

  // Ledger section (re-importable rows)
  let y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 34) + 12;

  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Lançamentos', 14, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(90);
  doc.text('Data', 14, y);
  doc.text('Descrição', 40, y);
  doc.text('Valor', 196, y, { align: 'right' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30);

  for (const transaction of sortTransactions(groups)) {
    if (y > 285) {
      doc.addPage();
      y = 20;
    }
    doc.text(formatDate(transaction.date), 14, y);
    doc.text(transaction.description, 40, y);
    doc.text(signedCurrency(transaction.value), 196, y, { align: 'right' });
    y += 5;
  }

  return doc;
};

export const exportGroupsToPDF = (groups: TransactionGroup[]) => {
  buildGroupsPdf(groups).save('transacoes-por-beneficiario.pdf');
};

const buildTransactionsSheetRows = (groups: TransactionGroup[]) =>
  sortTransactions(groups).map(t => ({
    'Data': formatDate(t.date),
    'Beneficiário': extractPayeeName(t.description),
    'Descrição': t.description,
    'Tipo': t.type === 'income' ? 'Entrada' : 'Saída',
    'Valor': t.value,
  }));

export const buildGroupsWorkbook = (groups: TransactionGroup[]): XLSX.WorkBook => {
  const totalIncome = groups.reduce((sum, g) => sum + g.totalIncome, 0);
  const totalExpense = groups.reduce((sum, g) => sum + g.totalExpense, 0);
  const totalNet = groups.reduce((sum, g) => sum + g.netTotal, 0);
  const totalCount = groups.reduce((sum, g) => sum + g.transactionCount, 0);

  const summaryData = groups.map(g => ({
    'Beneficiário': g.name,
    'Transações': g.transactionCount,
    'Entradas': g.totalIncome,
    'Saídas': g.totalExpense,
    'Saldo Líquido': g.netTotal,
  }));

  summaryData.push({
    'Beneficiário': 'TOTAL GERAL',
    'Transações': totalCount,
    'Entradas': totalIncome,
    'Saídas': totalExpense,
    'Saldo Líquido': totalNet,
  });

  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo por Beneficiário');

  const wsTransactions = XLSX.utils.json_to_sheet(buildTransactionsSheetRows(groups));
  wsTransactions['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 40 }, { wch: 10 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsTransactions, 'Todas as Transações');

  return wb;
};

export const exportGroupsToExcel = (groups: TransactionGroup[]) => {
  XLSX.writeFile(buildGroupsWorkbook(groups), 'transacoes-por-beneficiario.xlsx');
};
