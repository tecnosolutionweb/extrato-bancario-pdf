import * as pdfjsLib from 'pdfjs-dist';
import type { Transaction } from '@/data/transactions';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export const parsePDFToTransactions = async (file: File): Promise<Transaction[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const allText: string[] = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    allText.push(pageText);
  }
  
  const fullText = allText.join('\n');
  return extractTransactions(fullText);
};

const extractTransactions = (text: string): Transaction[] => {
  const transactions: Transaction[] = [];
  let idCounter = 1;
  
  // Clean up text - normalize whitespace
  const cleanText = text.replace(/\s+/g, ' ');
  
  // Try multiple patterns for different bank formats
  const patterns = [
    // Pattern 1: DD/MM/YYYY description value (Brazilian format with comma decimal)
    /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?\s*\d{1,3}(?:\.\d{3})*,\d{2})\b/g,
    // Pattern 2: DD/MM description value (short date)
    /(\d{2}\/\d{2})\s+(.+?)\s+(-?\s*\d{1,3}(?:\.\d{3})*,\d{2})\b/g,
    // Pattern 3: DD/MM/YY description value
    /(\d{2}\/\d{2}\/\d{2})\s+(.+?)\s+(-?\s*\d{1,3}(?:\.\d{3})*,\d{2})\b/g,
  ];
  
  // Try each pattern
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(cleanText)) !== null) {
      const dateStr = match[1];
      const description = match[2].trim();
      const valueStr = match[3].trim();
      
      // Skip header-like or irrelevant lines
      if (isHeaderOrNoise(description)) continue;
      
      // Parse date
      const date = parseDate(dateStr);
      if (!date) continue;
      
      // Parse value
      const value = parseValue(valueStr);
      if (value === 0 || isNaN(value)) continue;
      
      // Skip if description is too short or too long
      if (description.length < 3 || description.length > 100) continue;
      
      transactions.push({
        id: String(idCounter++),
        date,
        description: description.substring(0, 80),
        value,
        type: value > 0 ? 'income' : 'expense',
      });
    }
    
    // If we found transactions with this pattern, stop trying others
    if (transactions.length > 0) break;
  }
  
  // Remove duplicates based on date+description+value
  const seen = new Set<string>();
  const unique = transactions.filter(t => {
    const key = `${t.date}-${t.description}-${t.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  return unique;
};

const parseDate = (dateStr: string): string | null => {
  const parts = dateStr.split('/');
  if (parts.length < 2) return null;
  
  const day = parts[0];
  const month = parts[1];
  let year = parts[2];
  
  if (!year) {
    year = String(new Date().getFullYear());
  } else if (year.length === 2) {
    year = '20' + year;
  }
  
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);
  const dayNum = parseInt(day);
  
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return null;
  
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const parseValue = (valueStr: string): number => {
  // Remove spaces, convert Brazilian format to number
  const clean = valueStr.replace(/\s/g, '');
  // Remove dots (thousands separator), replace comma with dot (decimal)
  const normalized = clean.replace(/\./g, '').replace(',', '.');
  return parseFloat(normalized);
};

const isHeaderOrNoise = (text: string): boolean => {
  const noisePatterns = [
    /^saldo/i,
    /^total/i,
    /^data\s/i,
    /^descri/i,
    /^valor/i,
    /^extrato/i,
    /^agência/i,
    /^conta/i,
    /^cpf/i,
    /^cnpj/i,
    /^página/i,
    /^s\.a\./i,
    /^\d+$/,
    /^banco/i,
  ];
  
  return noisePatterns.some(p => p.test(text.trim()));
};
