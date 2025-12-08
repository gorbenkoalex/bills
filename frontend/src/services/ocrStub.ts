import type { ParsedReceipt } from '../types';

// Placeholder OCR interface that can be swapped out later.
// For now it returns a mock text while allowing users to edit raw text manually.
export async function extractRawTextFromFile(file: File): Promise<string> {
  const hint = file.type.includes('pdf') ? 'PDF' : 'image';
  return `MOCK RECEIPT (${hint}):\nSample Store d.o.o\n01.01.2024\nBread 1x 2.50 2.50\nMilk 2x 1.25 2.50\nUkupno 5.00`;
}

export function parsedReceiptToText(receipt: ParsedReceipt): string {
  const header = `${receipt.storeName ?? 'Store'} ${receipt.purchaseDate ?? ''}`.trim();
  const items = receipt.items
    .map((item) => `${item.description} ${item.quantity ?? 1}x ${item.price ?? 0} ${item.total ?? 0}`)
    .join('\n');
  const total = receipt.grandTotal != null ? `Total ${receipt.grandTotal.toFixed(2)}` : '';
  return [header, items, total].filter(Boolean).join('\n');
}
