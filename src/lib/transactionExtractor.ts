import type { Transaction } from '@/data/transactions';

const DATE_REGEX = /\b(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?\b/;

const MONEY_REGEX =
  /(-?)\s*(?:R\$\s*)?\(?\s*(\d{1,3}(?:\.\d{3})+|\d+),(\d{2})\)?(?:\s*(-|[DC])(?![0-9A-Za-z]))?/g;

// Fallback for OCR output that drops the decimal comma in the "Valor" column,
// e.g. "1641 D" (meaning 16,41 D) or "2144D" (21,44 D).
const COMPACT_MONEY_REGEX = /\b(\d{3,})\s?([DC])(?![0-9A-Za-z])/g;

export interface MoneyMatch {
  raw: string;
  value: number;
  index: number;
  hasExplicitSign: boolean;
}

export const findDate = (line: string, fallbackYear?: number): { iso: string; end: number } | null => {
  const match = DATE_REGEX.exec(line);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  let year = match[3] ? parseInt(match[3], 10) : (fallbackYear ?? new Date().getFullYear());

  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year < 1990 || year > 2100) return null;

  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { iso, end: match.index + match[0].length };
};

export const findMoneyMatches = (line: string): MoneyMatch[] => {
  const matches: MoneyMatch[] = [];
  const spans: Array<[number, number]> = [];
  MONEY_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = MONEY_REGEX.exec(line)) !== null) {
    const raw = match[0];
    const integerPart = match[2].replace(/\./g, '');
    const cents = match[3];

    let hasExplicitSign = false;
    let sign = 1;
    if (match[1] === '-') {
      sign = -1;
      hasExplicitSign = true;
    }
    if (match[4] === '-' || match[4] === 'D') {
      sign = -1;
      hasExplicitSign = true;
    }
    if (match[4] === 'C') {
      sign = 1;
      hasExplicitSign = true;
    }
    if (raw.includes('(') && raw.includes(')')) {
      sign = -1;
      hasExplicitSign = true;
    }

    matches.push({
      raw,
      value: sign * parseFloat(`${integerPart}.${cents}`),
      index: match.index,
      hasExplicitSign,
    });
    spans.push([match.index, match.index + raw.length]);
  }

  COMPACT_MONEY_REGEX.lastIndex = 0;
  while ((match = COMPACT_MONEY_REGEX.exec(line)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (spans.some(([spanStart, spanEnd]) => start < spanEnd && end > spanStart)) continue;

    const digits = match[1];
    const integerPart = digits.slice(0, -2);
    const cents = digits.slice(-2);
    const sign = match[2] === 'D' ? -1 : 1;

    matches.push({
      raw: match[0],
      value: sign * parseFloat(`${integerPart}.${cents}`),
      index: start,
      hasExplicitSign: true,
    });
  }

  return matches.sort((a, b) => a.index - b.index);
};

const NOISE_PATTERNS = [
  /^saldo/i,
  /^total/i,
  /^data\b/i,
  /^descri/i,
  /^hist[óo]rico/i,
  /^valor/i,
  /^extrato/i,
  /^ag[êe]ncia/i,
  /^conta/i,
  /^cpf/i,
  /^cnpj/i,
  /^p[áa]gina/i,
  /^banco/i,
  /^s\.?a\.?\b/i,
  /^dispon[íi]vel/i,
  /^limite/i,
  /^per[íi]odo/i,
  /^documento/i,
  /^lan[çc]amento/i,
  /entradas?\s*:/i,
  /sa[íi]das?\s*:/i,
  /^(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/i,
  /^\d+$/,
];

export const isNoise = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed) return true;
  return NOISE_PATTERNS.some((pattern) => pattern.test(trimmed));
};

const LEADING_DATE_REGEX = /^\s*\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?\s+/;

const normalizeDescription = (raw: string): string => {
  return raw
    .replace(LEADING_DATE_REGEX, '')
    .replace(/[-–]\s*$/, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–:]+/, '')
    .trim();
};

const pickValue = (matches: MoneyMatch[]): MoneyMatch => {
  if (matches.length === 1) return matches[0];
  return matches[matches.length - 2];
};

const SALDO_ANTERIOR_REGEX = /saldo\s+(anterior|inicial)/i;

const areClose = (a: number, b: number): boolean => Math.abs(a - b) < 0.005;

export const extractTransactionsFromLines = (lines: string[]): Transaction[] => {
  const transactions: Transaction[] = [];
  let lastDate: string | null = null;
  let previousBalance: number | null = null;
  let idCounter = 1;

  for (const line of lines) {
    if (SALDO_ANTERIOR_REGEX.test(line)) {
      const matches = findMoneyMatches(line);
      if (matches.length > 0) previousBalance = matches[matches.length - 1].value;
      continue;
    }

    const fallbackYear = lastDate ? parseInt(lastDate.slice(0, 4), 10) : undefined;
    const parsedDate = findDate(line, fallbackYear);
    if (parsedDate) lastDate = parsedDate.iso;

    const moneyMatches = findMoneyMatches(line);
    if (moneyMatches.length === 0) continue;

    if (isNoise(line)) continue;

    const date = parsedDate ? parsedDate.iso : lastDate;
    if (!date) continue;

    const chosen = pickValue(moneyMatches);
    if (!chosen || chosen.value === 0 || Number.isNaN(chosen.value)) continue;

    const magnitude = Math.abs(chosen.value);
    const balance = moneyMatches.length >= 2 ? moneyMatches[moneyMatches.length - 1] : null;

    let value: number;
    if (chosen.hasExplicitSign) {
      value = chosen.value;
    } else if (balance && previousBalance !== null) {
      const delta = balance.value - previousBalance;
      if (areClose(delta, magnitude)) value = magnitude;
      else if (areClose(delta, -magnitude)) value = -magnitude;
      else value = magnitude;
    } else {
      value = magnitude;
    }

    if (balance) previousBalance = balance.value;

    const descriptionStart = parsedDate ? parsedDate.end : 0;
    const description = normalizeDescription(line.slice(descriptionStart, chosen.index));

    if (description.length < 2 || description.length > 120) continue;

    transactions.push({
      id: String(idCounter++),
      date,
      description: description.substring(0, 80),
      value,
      type: value > 0 ? 'income' : 'expense',
    });
  }

  const seen = new Set<string>();
  return transactions.filter((t) => {
    const key = `${t.date}-${t.description}-${t.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
