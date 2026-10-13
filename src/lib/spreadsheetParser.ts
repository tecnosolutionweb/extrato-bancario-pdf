import * as XLSX from 'xlsx';
import type { Transaction } from '@/data/transactions';

const SPREADSHEET_EXTENSIONS = /\.(xlsx|xlsm|xls|csv|tsv)$/i;

const SPREADSHEET_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroEnabled.12',
  'application/vnd.ms-excel',
  'text/csv',
  'text/tab-separated-values',
  'application/csv',
]);

export const isSpreadsheetFile = (file: File): boolean =>
  SPREADSHEET_EXTENSIONS.test(file.name) || SPREADSHEET_MIME_TYPES.has(file.type);

const normalize = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const HEADER_CANDIDATES = {
  date: ['data', 'date', 'dia', 'vencimento'],
  description: ['descricao', 'descrição', 'historico', 'histórico', 'desc', 'memo', 'lancamento', 'lançamento'],
  payee: ['beneficiario', 'beneficiário', 'favorecido', 'payee', 'nome'],
  value: ['valor', 'value', 'montante', 'quantia', 'amount'],
  type: ['tipo', 'type', 'natureza', 'operacao', 'operação', 'debito/credito'],
};

const findKey = (keys: string[], candidates: string[]): string | undefined =>
  keys.find(key => candidates.some(candidate => normalize(key) === normalize(candidate))) ??
  keys.find(key => candidates.some(candidate => normalize(key).includes(normalize(candidate))));

const parseDate = (value: unknown): string | null => {
  if (value == null || value === '') return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toIso(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return toIso(parsed.y, parsed.m, parsed.d);
  }

  const str = String(value).trim();

  const br = str.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
  if (br) {
    const day = parseInt(br[1], 10);
    const month = parseInt(br[2], 10);
    let year = br[3] ? parseInt(br[3], 10) : new Date().getFullYear();
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return toIso(year, month, day);
  }

  const iso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return toIso(parseInt(iso[1], 10), parseInt(iso[2], 10), parseInt(iso[3], 10));

  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return toIso(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  }

  return null;
};

const toIso = (year: number, month: number, day: number): string =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const parseNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value == null) return null;

  const str = String(value).trim();
  const negative = /^-|^\(.*\)$/.test(str);
  const cleaned = str.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;

  let normalized = cleaned;
  if (cleaned.includes(',')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if ((cleaned.match(/\./g) ?? []).length > 1) {
    normalized = cleaned.replace(/\./g, '');
  }

  let parsed = parseFloat(normalized);
  if (Number.isNaN(parsed)) return null;
  if (negative) parsed = -Math.abs(parsed);
  return parsed;
};

const sheetToTransactions = (rows: Record<string, unknown>[]): Transaction[] => {
  if (rows.length === 0) return [];

  const keys = Object.keys(rows[0]);
  const dateKey = findKey(keys, HEADER_CANDIDATES.date);
  const valueKey = findKey(keys, HEADER_CANDIDATES.value);
  if (!dateKey || !valueKey) return [];

  const descriptionKey =
    findKey(keys, HEADER_CANDIDATES.description) ?? findKey(keys, HEADER_CANDIDATES.payee);
  const payeeKey = findKey(keys, HEADER_CANDIDATES.payee);
  const typeKey = findKey(keys, HEADER_CANDIDATES.type);

  const transactions: Transaction[] = [];

  for (const row of rows) {
    const date = parseDate(row[dateKey]);
    if (!date) continue;

    let value = parseNumber(row[valueKey]);
    if (value == null || value === 0) continue;

    const typeLabel = typeKey ? normalize(String(row[typeKey] ?? '')) : '';
    if (typeLabel) {
      if (/saida|debito|pagamento|despesa|debit/.test(typeLabel)) value = -Math.abs(value);
      else if (/entrada|credito|recebimento|receita|credit/.test(typeLabel)) value = Math.abs(value);
    }

    const description = String(
      (descriptionKey ? row[descriptionKey] : '') || (payeeKey ? row[payeeKey] : ''),
    ).trim();
    if (description.length < 2) continue;

    transactions.push({
      id: String(transactions.length + 1),
      date,
      description: description.substring(0, 80),
      value,
      type: value > 0 ? 'income' : 'expense',
    });
  }

  return transactions;
};

export const parseSpreadsheetBuffer = (data: Uint8Array): Transaction[] => {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    const transactions = sheetToTransactions(rows);
    if (transactions.length > 0) return transactions;
  }

  return [];
};

export const parseSpreadsheetToTransactions = async (file: File): Promise<Transaction[]> =>
  parseSpreadsheetBuffer(new Uint8Array(await file.arrayBuffer()));
