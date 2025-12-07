export type LineClass = 'ITEM' | 'TOTAL' | 'OTHER';

export interface ParsedItem {
  description: string;
  quantity?: number;
  price?: number;
  total?: number;
}

export interface ParsedReceipt {
  storeName?: string;
  purchaseDate?: string;
  grandTotal?: number;
  items: ParsedItem[];
  rawText: string;
}

export interface TrainingSample {
  rawText: string;
  parsedBefore: ParsedReceipt;
  parsedAfter: ParsedReceipt;
  createdAt: string;
}
