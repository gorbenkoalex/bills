import type { LineClass, ModelMode, ModelRunResult, ParsedItem, ParsedReceipt, RawReceiptInput } from '../types';
import { buildMetadata, getDefaultConfig, runModel } from './aiModel';

const dateRegex = /(\d{4}[./-]\d{2}[./-]\d{2})|(\d{2}[./-]\d{2}[./-]\d{4})/;
const totalKeywords = /(ukupno|total|zbroj|sum|za\s*platiti|grand\s*total|amount\s*due)/i;
const itemPatterns: RegExp[] = [
  /^(?<desc>.+?)\s+(?<qty>\d+[.,]?\d*)\s*[x×]\s*(?<price>\d+[.,]\d{2})\s+(?<total>\d+[.,]\d{2})/i,
  /^(?<qty>\d+[.,]?\d*)\s*[x×*]\s*(?<price>\d+[.,]\d{2})\s+(?<total>\d+[.,]\d{2})\s+(?<desc>.+)$/i,
  /^(?<desc>.+?)\s+(?<qty>\d+[.,]?\d*)\s+(?<price>\d+[.,]\d{2})\s+(?<total>\d+[.,]\d{2})/i
];

function normalizeNumber(text?: string): number | undefined {
  if (!text) return undefined;
  const cleaned = text.replace(/[^\d.,-]/g, '').replace(',', '.');
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

function selectStore(lines: string[]): string | undefined {
  return lines.find((l) => /[a-z]/i.test(l) && !/\d{6,}/.test(l));
}

function findDate(lines: string[]): string | undefined {
  for (const line of lines) {
    const match = line.match(dateRegex);
    if (match) return match[0];
  }
  return undefined;
}

function findTotal(lines: string[], labels: LineClass[]): number | undefined {
  let candidate: number | undefined;
  lines.forEach((line, idx) => {
    const numericMatches = line.match(/\d+[.,]\d{2,}/g) || [];
    const best = numericMatches.map(normalizeNumber).find((n) => typeof n === 'number');
    if (labels[idx] === 'TOTAL' || totalKeywords.test(line)) {
      if (typeof best === 'number') candidate = best;
    }
  });
  if (typeof candidate === 'number') return candidate;
  const numbers = lines
    .map((l) => (l.match(/\d+[.,]\d{2,}/g) || []).map(normalizeNumber))
    .flat()
    .filter((n): n is number => typeof n === 'number');
  return numbers.length ? Math.max(...numbers) : undefined;
}

function parseItems(lines: string[], labels: LineClass[]): ParsedItem[] {
  const items: ParsedItem[] = [];
  lines.forEach((line, idx) => {
    if (labels[idx] !== 'ITEM' && !/x|×/.test(line)) return;
    for (const pattern of itemPatterns) {
      const match = line.match(pattern);
      if (match && match.groups) {
        const { desc, qty, price, total } = match.groups as Record<string, string>;
        items.push({
          description: (desc || line).trim(),
          quantity: normalizeNumber(qty),
          price: normalizeNumber(price),
          total: normalizeNumber(total)
        });
        return;
      }
    }
  });
  if (!items.length) {
    // Fallback: run patterns across all lines regardless of model labels so
    // receipts still yield items when the classifier fails to load.
    lines.forEach((line) => {
      for (const pattern of itemPatterns) {
        const match = line.match(pattern);
        if (match && match.groups) {
          const { desc, qty, price, total } = match.groups as Record<string, string>;
          items.push({
            description: (desc || line).trim(),
            quantity: normalizeNumber(qty),
            price: normalizeNumber(price),
            total: normalizeNumber(total)
          });
          return;
        }
      }
    });
  }
  return items;
}

async function parseWithModel(
  modelId: 'live' | 'local',
  raw: RawReceiptInput,
  mode: ModelMode
): Promise<ModelRunResult> {
  const config = getDefaultConfig();
  const lineClasses: LineClass[] = await runModel(modelId, raw, config).catch(() =>
    raw.lines.map(() => 'OTHER' as LineClass)
  );

  const parsed: ParsedReceipt = {
    storeName: selectStore(raw.lines),
    purchaseDate: findDate(raw.lines),
    grandTotal: findTotal(raw.lines, lineClasses),
    items: parseItems(raw.lines, lineClasses),
    rawText: raw.rawText
  };

  return {
    parsed,
    lineClasses,
    metadata: buildMetadata(modelId, mode, config)
  };
}

export interface ParsingResult {
  active: ModelRunResult;
  live?: ModelRunResult;
  local?: ModelRunResult;
}

export async function parseReceipt(raw: RawReceiptInput, mode: ModelMode): Promise<ParsingResult> {
  if (!raw.lines.length) {
    throw new Error('No lines provided for parsing');
  }

  if (mode === 'ensemble') {
    const [live, local] = await Promise.all([parseWithModel('live', raw, mode), parseWithModel('local', raw, mode)]);
    return { active: live, live, local };
  }

  const result = await parseWithModel(mode === 'live' ? 'live' : 'local', raw, mode);
  return { active: result, [mode]: result };
}
