
# Plano: Exportar Transações Agrupadas para PDF e Excel

## Objetivo
Adicionar dois botões na visualização "Por Beneficiário" para exportar os dados agrupados:
- **PDF**: Relatório formatado com tabela de grupos e totais
- **Excel**: Planilha com duas abas (resumo por beneficiário + todas as transações)

## Bibliotecas a Instalar

| Biblioteca | Propósito |
|------------|-----------|
| `jspdf` | Geração de PDF no navegador |
| `jspdf-autotable` | Plugin para tabelas formatadas no PDF |
| `xlsx` | Geração de arquivos Excel (SheetJS) |

## Arquitetura da Solução

### Novo Componente: ExportButtons.tsx
Componente com dois botões estilizados que disparam as funções de exportação.

### Funções de Exportação

**exportGroupsToPDF(groups)**
- Cria documento PDF A4
- Adiciona título e data de geração
- Tabela com colunas: Beneficiário, Transações, Entradas, Saídas, Saldo
- Estiliza valores positivos/negativos
- Adiciona totais gerais no rodapé

**exportGroupsToExcel(groups)**
- Cria workbook com duas abas:
  - **Resumo**: Tabela de grupos com totais
  - **Transações**: Lista completa de todas as transações
- Formata colunas de valores como moeda
- Adiciona linha de totais

### Interface Visual

```text
+------------------------------------------+
| Transações                               |
| [Lista] [Por Beneficiário]               |
|                                          |
| Busca: [____________]  [📄 PDF] [📊 Excel]|
| Filtro: [Todos] [+] [-]                  |
+------------------------------------------+
```

## Arquivos a Modificar/Criar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/lib/exportUtils.ts` | Criar | Funções de exportação PDF e Excel |
| `src/components/ExportButtons.tsx` | Criar | Componente com botões de exportação |
| `src/components/TransactionFilters.tsx` | Modificar | Adicionar botões de exportação |
| `src/pages/Index.tsx` | Modificar | Passar grupos filtrados para exportação |

## Detalhes Tecnicos

### Estrutura do PDF

```text
+------------------------------------------+
|     RELATÓRIO DE TRANSAÇÕES              |
|     Por Beneficiário                     |
|     Período: Nov 2025 - Fev 2026         |
|     Gerado em: 06/02/2026                |
+------------------------------------------+
| Beneficiário | Qtd | Entradas | Saídas | Saldo |
|--------------|-----|----------|--------|-------|
| HENRIQU      | 23  | R$ 0,00  | R$ 8k  | -R$ 8k|
| TERCIO       |  5  | R$ 100k  | R$ 0   | +R$100k|
| ...          | ... | ...      | ...    | ...   |
+------------------------------------------+
| TOTAIS       | 429 | R$ 894k  | R$ 793k| +R$100k|
+------------------------------------------+
```

### Estrutura do Excel

**Aba "Resumo por Beneficiário":**
| Beneficiário | Transações | Entradas | Saídas | Saldo Líquido |
|--------------|------------|----------|--------|---------------|
| HENRIQU | 23 | R$ 0,00 | R$ 8.204,00 | -R$ 8.204,00 |
| ... | ... | ... | ... | ... |

**Aba "Todas as Transações":**
| Data | Beneficiário | Descrição | Tipo | Valor |
|------|--------------|-----------|------|-------|
| 05/02/2026 | RSCSS | RSCSS MINI KALZONE | Saída | -R$ 26,50 |
| ... | ... | ... | ... | ... |

### Código de Exportação PDF

```typescript
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportGroupsToPDF = (groups: TransactionGroup[]) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Relatório de Transações por Beneficiário', 14, 20);
  
  doc.autoTable({
    startY: 35,
    head: [['Beneficiário', 'Qtd', 'Entradas', 'Saídas', 'Saldo']],
    body: groups.map(g => [
      g.name,
      g.transactionCount,
      formatCurrency(g.totalIncome),
      formatCurrency(g.totalExpense),
      formatCurrency(g.netTotal)
    ]),
  });
  
  doc.save('transacoes-por-beneficiario.pdf');
};
```

### Código de Exportação Excel

```typescript
import * as XLSX from 'xlsx';

export const exportGroupsToExcel = (groups: TransactionGroup[]) => {
  const summaryData = groups.map(g => ({
    'Beneficiário': g.name,
    'Transações': g.transactionCount,
    'Entradas': g.totalIncome,
    'Saídas': g.totalExpense,
    'Saldo': g.netTotal
  }));
  
  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');
  
  XLSX.writeFile(wb, 'transacoes-por-beneficiario.xlsx');
};
```

## Fluxo de Uso
1. Usuário aplica filtros na tela (busca, tipo)
2. Usuário alterna para visualização "Por Beneficiário"
3. Clica em "PDF" ou "Excel"
4. Sistema gera arquivo com dados filtrados
5. Download automático do arquivo

## Benefícios
- Exportar relatórios para compartilhar ou arquivar
- Ver totais por beneficiário em formato imprimível
- Planilha editável para análises adicionais no Excel
- Respeita os filtros aplicados na tela
