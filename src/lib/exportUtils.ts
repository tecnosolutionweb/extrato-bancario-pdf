import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { TransactionGroup, formatCurrency, extractPayeeName } from '@/data/transactions';

export const exportGroupsToPDF = (groups: TransactionGroup[]) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Transações por Beneficiário', 14, 20);
  
  // Subtitle with period
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Período: Nov 2025 - Fev 2026', 14, 28);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 34);
  
  // Calculate totals
  const totalIncome = groups.reduce((sum, g) => sum + g.totalIncome, 0);
  const totalExpense = groups.reduce((sum, g) => sum + g.totalExpense, 0);
  const totalNet = groups.reduce((sum, g) => sum + g.netTotal, 0);
  const totalCount = groups.reduce((sum, g) => sum + g.transactionCount, 0);
  
  // Table data
  const tableData = groups.map(g => [
    g.name,
    g.transactionCount.toString(),
    formatCurrency(g.totalIncome),
    formatCurrency(g.totalExpense),
    formatCurrency(g.netTotal)
  ]);
  
  // Add totals row
  tableData.push([
    'TOTAL GERAL',
    totalCount.toString(),
    formatCurrency(totalIncome),
    formatCurrency(totalExpense),
    formatCurrency(totalNet)
  ]);

  autoTable(doc, {
    startY: 42,
    head: [['Beneficiário', 'Qtd', 'Entradas', 'Saídas', 'Saldo']],
    body: tableData,
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' },
    },
    didParseCell: (data) => {
      // Style the last row (totals) differently
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [226, 232, 240];
      }
    },
  });
  
  doc.save('transacoes-por-beneficiario.pdf');
};

export const exportGroupsToExcel = (groups: TransactionGroup[]) => {
  // Summary sheet data
  const summaryData = groups.map(g => ({
    'Beneficiário': g.name,
    'Transações': g.transactionCount,
    'Entradas': g.totalIncome,
    'Saídas': g.totalExpense,
    'Saldo Líquido': g.netTotal
  }));
  
  // Add totals row
  const totalIncome = groups.reduce((sum, g) => sum + g.totalIncome, 0);
  const totalExpense = groups.reduce((sum, g) => sum + g.totalExpense, 0);
  const totalNet = groups.reduce((sum, g) => sum + g.netTotal, 0);
  const totalCount = groups.reduce((sum, g) => sum + g.transactionCount, 0);
  
  summaryData.push({
    'Beneficiário': 'TOTAL GERAL',
    'Transações': totalCount,
    'Entradas': totalIncome,
    'Saídas': totalExpense,
    'Saldo Líquido': totalNet
  });
  
  // Transactions sheet data - all transactions from all groups
  const allTransactions = groups.flatMap(g => 
    g.transactions.map(t => ({
      'Data': new Date(t.date).toLocaleDateString('pt-BR'),
      'Beneficiário': extractPayeeName(t.description),
      'Descrição': t.description,
      'Tipo': t.type === 'income' ? 'Entrada' : 'Saída',
      'Valor': t.value
    }))
  ).sort((a, b) => {
    // Sort by date descending
    const dateA = a['Data'].split('/').reverse().join('-');
    const dateB = b['Data'].split('/').reverse().join('-');
    return dateB.localeCompare(dateA);
  });
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Summary sheet
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [
    { wch: 30 }, // Beneficiário
    { wch: 12 }, // Transações
    { wch: 15 }, // Entradas
    { wch: 15 }, // Saídas
    { wch: 15 }, // Saldo
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo por Beneficiário');
  
  // Transactions sheet
  const wsTransactions = XLSX.utils.json_to_sheet(allTransactions);
  wsTransactions['!cols'] = [
    { wch: 12 }, // Data
    { wch: 25 }, // Beneficiário
    { wch: 40 }, // Descrição
    { wch: 10 }, // Tipo
    { wch: 15 }, // Valor
  ];
  XLSX.utils.book_append_sheet(wb, wsTransactions, 'Todas as Transações');
  
  XLSX.writeFile(wb, 'transacoes-por-beneficiario.xlsx');
};
