import type { ParsedReceipt } from './types';

const staticParsed: Omit<ParsedReceipt, 'rawText'> = {
  storeName: 'Tailwind Market',
  purchaseDate: '2024-01-15',
  grandTotal: 42.5,
  items: [
    { description: 'Sample apples', quantity: 2, price: 3.5, total: 7 },
    { description: 'Demo bread', quantity: 1, price: 2.5, total: 2.5 },
    { description: 'Placeholder coffee', quantity: 1, price: 8.99, total: 8.99 },
    { description: 'Reusable bag', quantity: 1, price: 0.99, total: 0.99 },
    { description: 'Fresh veggies pack', quantity: 3, price: 3.34, total: 10.02 },
    { description: 'Household cleaner', quantity: 1, price: 13, total: 13 }
  ]
};

export async function parseReceipt(rawText: string): Promise<ParsedReceipt> {
  return { ...staticParsed, rawText };
}
