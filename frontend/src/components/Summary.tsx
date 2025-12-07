import React from 'react';

interface Props {
  storeName?: string;
  purchaseDate?: string;
  grandTotal?: number;
  onChange: (key: 'storeName' | 'purchaseDate' | 'grandTotal', value: string) => void;
}

export const Summary: React.FC<Props> = ({ storeName, purchaseDate, grandTotal, onChange }) => (
  <div className="card">
    <div className="summary-fields">
      <div>
        <label>Store</label>
        <input
          value={storeName ?? ''}
          onChange={(e) => onChange('storeName', e.target.value)}
          placeholder="Store name"
        />
      </div>
      <div>
        <label>Date</label>
        <input
          value={purchaseDate ?? ''}
          onChange={(e) => onChange('purchaseDate', e.target.value)}
          placeholder="YYYY-MM-DD"
        />
      </div>
      <div>
        <label>Total</label>
        <input
          type="number"
          step="0.01"
          value={grandTotal ?? ''}
          onChange={(e) => onChange('grandTotal', e.target.value)}
          placeholder="0.00"
        />
      </div>
    </div>
  </div>
);
