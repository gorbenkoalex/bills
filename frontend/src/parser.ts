import { classifyLine } from './aiModel';
import type { LineClass, ParsedItem, ParsedReceipt } from './types';

const totalKeywords = /(total|ukupno|zbroj|za platiti|summa|grand)/i;
const dateRegex = /(\d{4}[./-]\d{2}[./-]\d{2})|(\d{2}[./-]\d{2}[./-]\d{4})/;

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

async function classifyLines(lines: string[]): Promise<LineClass[]> {
  const results: LineClass[] = [];
  for (const line of lines) {
    const classification = await classifyLine(line);
    results.push(classification);
  }
  return results;
}

function parseItemFromLine(line: string): ParsedItem | null {
  const normalized = normalizeLine(line);
  const patterns = [
    /^(?<desc>.+?)\s+(?<qty>\d+[.,]?\d*)x\s*(?<price>\d+[.,]\d{2})\s+(?<total>\d+[.,]\d{2})$/i,
    /^(?<desc>.+?)\s+(?<qty>\d+[.,]?\d*)\s*[x\*]\s*(?<price>\d+[.,]\d{2})\s*(?<total>\d+[.,]\d{2})$/i,
    /^(?<desc>.+?)\s+(?<total>\d+[.,]\d{2})$/
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match && match.groups) {
      const toNumber = (value?: string) =>
        value ? Number(value.replace(',', '.')) : undefined;
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

function inferStoreName(lines: string[]): string | undefined {
  return lines.find((line) => /d\.o\.o|sp\.z o\.o|shop|market|store|plodine|spar|kaufland/i.test(line))?.trim();
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
    const looksLikeItem = classes[idx] === 'ITEM' || /\d+[.,]\d{2}/.test(normalized);
    if (!looksLikeItem) return;
    const parsed = parseItemFromLine(normalized);
    if (parsed) {
      items.push(parsed);
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
