import React from 'react';
import type { ParsedItem } from '../types';

interface Props {
  items: ParsedItem[];
  onItemChange: (index: number, key: keyof ParsedItem, value: string) => void;
  onAddRow: () => void;
}

export const ItemsTable: React.FC<Props> = ({ items, onItemChange, onAddRow }) => (
  <div className="card space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-semibold">Items</h3>
      <button type="button" className="ghost-btn" onClick={onAddRow}>
        Add row
      </button>
    </div>
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <table className="receipt-table">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3">Description</th>
            <th className="px-3">Qty</th>
            <th className="px-3">Price</th>
            <th className="px-3">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="odd:bg-white even:bg-slate-50/40">
              <td className="px-3">
                <input
                  className="input-field"
                  value={item.description}
                  onChange={(e) => onItemChange(idx, 'description', e.target.value)}
                  placeholder="Item"
                />
              </td>
              <td className="px-3">
                <input
                  className="input-field"
                  type="number"
                  step="0.01"
                  value={item.quantity ?? ''}
                  onChange={(e) => onItemChange(idx, 'quantity', e.target.value)}
                  placeholder="1"
                />
              </td>
              <td className="px-3">
                <input
                  className="input-field"
                  type="number"
                  step="0.01"
                  value={item.price ?? ''}
                  onChange={(e) => onItemChange(idx, 'price', e.target.value)}
                  placeholder="0.00"
                />
              </td>
              <td className="px-3">
                <input
                  className="input-field"
                  type="number"
                  step="0.01"
                  value={item.total ?? ''}
                  onChange={(e) => onItemChange(idx, 'total', e.target.value)}
                  placeholder="0.00"
                />
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td className="px-3 py-4 text-sm text-slate-600" colSpan={4}>
                No items parsed yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);
