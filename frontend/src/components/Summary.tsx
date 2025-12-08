import React from 'react';

interface Props {
  storeName?: string;
  purchaseDate?: string;
  grandTotal?: number;
  onChange: (key: 'storeName' | 'purchaseDate' | 'grandTotal', value: string) => void;
}

export const Summary: React.FC<Props> = ({ storeName, purchaseDate, grandTotal, onChange }) => (
  <div className="card">
    <div className="grid gap-4 md:grid-cols-3">
      <div>
        <label className="label-text" htmlFor="store">
          Store
        </label>
        <input
          id="store"
          className="input-field"
          value={storeName ?? ''}
          onChange={(e) => onChange('storeName', e.target.value)}
          placeholder="Store name"
        />
      </div>
      <div>
        <label className="label-text" htmlFor="date">
          Date
        </label>
        <input
          id="date"
          className="input-field"
          value={purchaseDate ?? ''}
          onChange={(e) => onChange('purchaseDate', e.target.value)}
          placeholder="YYYY-MM-DD"
        />
      </div>
      <div>
        <label className="label-text" htmlFor="total">
          Total
        </label>
        <input
          id="total"
          className="input-field"
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
