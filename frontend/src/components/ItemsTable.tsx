import React from 'react';
import type { ParsedItem } from '../types';

interface Props {
  items: ParsedItem[];
  onItemChange: (index: number, key: keyof ParsedItem, value: string) => void;
  onAddRow: () => void;
}

export const ItemsTable: React.FC<Props> = ({ items, onItemChange, onAddRow }) => (
  <div className="card">
    <div className="status-row">
      <h3>Items</h3>
      <button type="button" onClick={onAddRow}>
        Add row
      </button>
    </div>
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td>
                <input
                  value={item.description}
                  onChange={(e) => onItemChange(idx, 'description', e.target.value)}
                  placeholder="Item"
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.01"
                  value={item.quantity ?? ''}
                  onChange={(e) => onItemChange(idx, 'quantity', e.target.value)}
                  placeholder="1"
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.01"
                  value={item.price ?? ''}
                  onChange={(e) => onItemChange(idx, 'price', e.target.value)}
                  placeholder="0.00"
                />
              </td>
              <td>
                <input
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
              <td colSpan={4}>No items parsed yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);
