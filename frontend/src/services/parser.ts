import { classifyLine, getModelStatus } from './aiModel';
import type { LineClass, ParsedItem, ParsedReceipt } from '../types';

const totalKeywords = /(total|ukupno|zbroj|za platiti|grand|suma|summa|suma za platiti)/i;
const dateRegex = /(\d{4}[./-]\d{2}[./-]\d{2})|(\d{2}[./-]\d{2}[./-]\d{4})/;

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

function toNumber(value?: string): number | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const asNumber = Number(normalized);
  return Number.isNaN(asNumber) ? undefined : asNumber;
}

async function classifyLines(lines: string[]): Promise<LineClass[]> {
  // If the ONNX model failed to load, skip classification to avoid unnecessary work.
  if (!getModelStatus().loaded) {
    return lines.map(() => 'OTHER');
  }
  const jobs = lines.map((line) => classifyLine(line));
  return Promise.all(jobs);
}

function parseInlineItem(line: string): ParsedItem | null {
  const normalized = normalizeLine(line);
  const patterns = [
    /^(?<desc>.+?)\s+(?<qty>\d+[.,]?\d*)\s*[x×]\s*(?<price>\d+[.,]\d{2})\s+(?<total>\d+[.,]\d{2})$/i,
    /^(?<desc>.+?)\s+(?<qty>\d+[.,]?\d*)\s*[*]\s*(?<price>\d+[.,]\d{2}).*?(?<total>\d+[.,]\d{2})$/i,
    /^(?<desc>.+?)\s+(?<qty>\d+[.,]?\d*)\s+(?<price>\d+[.,]\d{2})\s+(?<total>\d+[.,]\d{2})$/i,
    /^(?<desc>.+?)\s+(?<price>\d+[.,]\d{2})\s+(?<total>\d+[.,]\d{2})$/i,
    /^(?<desc>.+?)\s+(?<total>\d+[.,]\d{2})$/
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.groups) {
      return {
        description: match.groups.desc.trim(),
        quantity: toNumber(match.groups.qty),
        price: toNumber(match.groups.price),
        total: toNumber(match.groups.total)
      };
    }
  }
  return null;
}

function parseTwoLineItem(descLine: string, valueLine: string): ParsedItem | null {
  const normalized = normalizeLine(valueLine);
  const pattern = /^(?<qty>\d+[.,]?\d*)\s*[x×*]\s*(?<price>\d+[.,]\d{2})\s+(?<total>\d+[.,]\d{2})$/i;
  const match = normalized.match(pattern);
  if (!match?.groups) return null;
  return {
    description: normalizeLine(descLine),
    quantity: toNumber(match.groups.qty),
    price: toNumber(match.groups.price),
    total: toNumber(match.groups.total)
  };
}

function inferStoreName(lines: string[]): string | undefined {
  const headerSlice = lines.slice(0, 5);
  return headerSlice.find((line) => /d\.o\.o|sp\.z|shop|market|store|plodine|spar|kaufland|lidl|aldi/i.test(line))?.trim();
}

function inferDate(lines: string[]): string | undefined {
  for (const line of lines) {
    const match = line.match(dateRegex);
    if (match) return match[0];
  }
  return undefined;
}

function inferTotal(lines: string[], classes: LineClass[]): number | undefined {
  let candidate: number | undefined;

  lines.forEach((line, idx) => {
    const normalized = normalizeLine(line);
    const numericMatches = normalized.match(/(\d+[.,]\d{2})/g);
    if (!numericMatches) return;

    const maybeTotal = Number(numericMatches[numericMatches.length - 1].replace(',', '.'));
    const isTotalLine = totalKeywords.test(normalized) || classes[idx] === 'TOTAL';

    if (isTotalLine) {
      candidate = maybeTotal;
    }
  });

  if (candidate !== undefined) return candidate;

  const numericLines = lines
    .map((line) => Number(line.replace(/[^0-9.,]/g, '').replace(',', '.')))
    .filter((n) => !Number.isNaN(n));

  return numericLines.at(-1);
}

export async function parseReceipt(rawText: string): Promise<ParsedReceipt> {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const classes = await classifyLines(lines);
  const items: ParsedItem[] = [];

  lines.forEach((line, idx) => {
    const normalized = normalizeLine(line);
    const classification = classes[idx];
    const looksLikeItem = classification === 'ITEM' || /(\d+[.,]\d{2}).*(\d+[.,]\d{2})/.test(normalized);

    // Inline item
    const inlineItem = looksLikeItem ? parseInlineItem(normalized) : null;
    if (inlineItem) {
      items.push(inlineItem);
      return;
    }

    // Two-line item (description followed by qty x price total)
    if (idx < lines.length - 1) {
      const next = normalizeLine(lines[idx + 1]);
      const paired = parseTwoLineItem(normalized, next);
      if (paired) {
        items.push(paired);
      }
    }
  });

  const grandTotal = inferTotal(lines, classes);
  const storeName = inferStoreName(lines);
  const purchaseDate = inferDate(lines);

  return {
    storeName,
    purchaseDate,
    grandTotal,
    items,
    rawText
  };
}
