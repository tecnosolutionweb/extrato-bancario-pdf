# Extrato Banco PDF

Aplicação web que lê extratos bancários em **PDF ou imagem** direto no navegador, extrai as transações e apresenta tudo de forma organizada — com filtros, agrupamento por beneficiário, exportação e gráficos para acompanhar entradas e gastos.

Todo o processamento acontece **localmente no navegador**: nenhum arquivo é enviado para servidores.

## Principais recursos

- **Importação de extratos** por arrastar-e-soltar ou seleção de arquivo (`.pdf`, `.png`, `.jpg`, `.webp`, etc.).
- **Leitura de PDF com texto** e **OCR automático** para PDFs digitalizados ou imagens (via Tesseract.js).
- **Suporte a PDFs protegidos por senha** — solicita a senha e desbloqueia o arquivo.
- **Resumo do período**: total de entradas, total de saídas, saldo e número de transações.
- **Filtros**: busca por descrição, tipo (entrada/saída) e intervalo de datas.
- **Duas visões**: lista de transações ou agrupamento por beneficiário.
- **Página de gráficos** (`/graficos`):
  - Proporção de entradas x gastos (donut);
  - Entradas e gastos por mês (barras);
  - Evolução do saldo acumulado (linha);
  - Ranking dos maiores gastos.
- **Exportação** dos dados agrupados para **PDF** e **Excel** (`.xlsx`).
- **PWA** — pode ser instalado como app no celular ou desktop.

## Tecnologias

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) e componentes no estilo [shadcn/ui](https://ui.shadcn.com/)
- [Recharts](https://recharts.org/) para os gráficos
- [pdf.js](https://mozilla.github.io/pdf.js/) para leitura de PDF
- [Tesseract.js](https://github.com/naptha/tesseract.js) para OCR
- [jsPDF](https://github.com/parallax/jsPDF) + [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) e [SheetJS](https://sheetjs.com/) para exportação
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) para testes

## Pré-requisitos

- Node.js 20+ e npm (ou [Bun](https://bun.sh/), pelo `bun.lock` presente no repositório).

## Rodando localmente

```sh
# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento (http://localhost:8080)
npm run dev
```

### Outros scripts

```sh
npm run build      # build de produção (gera a pasta dist/)
npm run preview    # pré-visualiza o build de produção
npm run lint       # análise de lint (ESLint)
npm test           # executa os testes (Vitest)
npm run test:watch # testes em modo watch
```

## Deploy com Docker

O projeto inclui `Dockerfile` (build multi-stage com Nginx) e `nginx.conf`.

```sh
# Build da imagem
docker build -t extrato-bancario-pdf .

# Executar o container (aplicação disponível em http://localhost:3000)
docker run -p 3000:3000 extrato-bancario-pdf
```

## Estrutura do projeto

```
src/
├── components/          # Componentes de UI da aplicação
│   ├── ui/              # Componentes base (shadcn/ui)
│   ├── PdfUpload.tsx    # Upload e processamento de PDF/imagem
│   ├── TransactionFilters.tsx
│   ├── TransactionTable.tsx
│   ├── TransactionGroups.tsx
│   ├── SummaryCard.tsx
│   └── ExportButtons.tsx
├── contexts/            # Estado compartilhado (transações)
├── data/                # Tipos e utilitários de transações
├── hooks/               # Hooks reutilizáveis
├── lib/                 # Parser de PDF, OCR e extração de transações
│   ├── pdfParser.ts
│   ├── pdfLines.ts
│   ├── pdfjs.ts
│   ├── ocr.ts
│   ├── transactionExtractor.ts
│   └── exportUtils.ts
├── pages/
│   ├── Index.tsx        # Importação, resumo e lista de transações
│   └── Charts.tsx       # Página de gráficos (/graficos)
└── main.tsx
```

## Como funciona

1. **Entrada do arquivo** — o usuário arrasta ou seleciona um PDF/imagem em `PdfUpload`.
2. **Extração de texto** — para PDFs com texto, o `pdfParser` lê o conteúdo diretamente. Se o PDF não tiver texto (digitalizado) ou for uma imagem, o `ocr.ts` aplica OCR para obter as linhas.
3. **Interpretação das transações** — `transactionExtractor` identifica data, descrição, valor e tipo (entrada/saída) a partir das linhas.
4. **Visualização** — as transações ficam disponíveis por meio do `TransactionsContext` e são exibidas nas telas de lista e de gráficos.

## Privacidade

Os arquivos são lidos e processados integralmente no navegador. Nada é enviado para servidores externos, e os dados deixam de existir ao recarregar a página.
