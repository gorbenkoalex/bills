import { useEffect, useState } from 'react';
import './styles.css';
import { loadLineClassifier, getModelStatus } from './aiModel';
import { parseReceipt } from './parser';
import { runOcr } from './ocr';
import { saveTrainingSample } from './api';
import type { ParsedReceipt, ParsedItem } from './types';

const emptyReceipt: ParsedReceipt = {
  storeName: undefined,
  purchaseDate: undefined,
  grandTotal: undefined,
  items: [],
  rawText: ''
};

export function App() {
  const [rawText, setRawText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedReceipt>(emptyReceipt);
  const [edited, setEdited] = useState<ParsedReceipt>(emptyReceipt);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const [modelStatus, setModelStatus] = useState(getModelStatus());

  useEffect(() => {
    loadLineClassifier().then(() => setModelStatus(getModelStatus()));
  }, []);

  const handleParse = async () => {
    setLoading(true);
    setSaveStatus(null);
    try {
      let text = rawText.trim();
      if (!text && file) {
        text = await runOcr(file);
        setRawText(text);
      }
      if (!text) {
        throw new Error('Please provide raw text or upload a receipt image/PDF.');
      }
      const receipt = await parseReceipt(text);
      setParsed(receipt);
      setEdited(receipt);
    } catch (err) {
      setSaveStatus((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index: number, key: keyof ParsedItem, value: string) => {
    setEdited((current) => {
      const nextItems = [...current.items];
      const numeric = ['quantity', 'price', 'total'].includes(key as string)
        ? Number(value)
        : value;
      nextItems[index] = {
        ...nextItems[index],
        [key]: value === '' ? undefined : numeric
      } as ParsedItem;
      return { ...current, items: nextItems };
    });
  };

  const handleSummaryChange = (key: 'storeName' | 'purchaseDate' | 'grandTotal', value: string) => {
    setEdited((current) => ({
      ...current,
      [key]: key === 'grandTotal' && value ? Number(value) : value || undefined
    }));
  };

  const handleSave = async () => {
    if (!parsed.rawText) {
      setSaveStatus('Nothing to save yet. Please parse a receipt first.');
      return;
    }
    const payload = {
      rawText: parsed.rawText,
      parsedBefore: parsed,
      parsedAfter: edited,
      createdAt: new Date().toISOString()
    };

    try {
      await saveTrainingSample(payload);
      setSaveStatus('Saved training sample successfully.');
    } catch (err) {
      setSaveStatus((err as Error).message);
    }
  };

  const addEmptyRow = () => {
    setEdited((current) => ({
      ...current,
      items: [...current.items, { description: '', quantity: undefined, price: undefined, total: undefined }]
    }));
  };

  return (
    <div className="app-shell">
      <div className="card">
        <h1>Receipt parser with ONNX + rules</h1>
        <p className="footer-note">
          Paste raw text or upload JPG/PNG/HEIC/PDF, parse, edit, and confirm to create training examples.
        </p>
      </div>

      <div className="card">
        <div className="grid">
          <div>
            <label htmlFor="file">Upload receipt (JPG, PNG, HEIC, PDF)</label>
            <input
              id="file"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div>
            <label htmlFor="raw">Raw text</label>
            <textarea
              id="raw"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste OCR text or type here"
            />
          </div>
        </div>
        <div className="actions" style={{ marginTop: 12 }}>
          <button onClick={handleParse} disabled={loading}>
            {loading ? 'Parsing…' : 'Parse'}
          </button>
          <span className="badge">
            Model: {modelStatus.loaded ? 'ONNX loaded' : 'Rules only'}
            {modelStatus.error ? ` (error: ${modelStatus.error})` : ''}
          </span>
        </div>
      </div>

      <div className="card">
        <div className="summary-fields">
          <div>
            <label>Store</label>
            <input
              value={edited.storeName ?? ''}
              onChange={(e) => handleSummaryChange('storeName', e.target.value)}
              placeholder="Store name"
            />
          </div>
          <div>
            <label>Date</label>
            <input
              value={edited.purchaseDate ?? ''}
              onChange={(e) => handleSummaryChange('purchaseDate', e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div>
            <label>Total</label>
            <input
              type="number"
              step="0.01"
              value={edited.grandTotal ?? ''}
              onChange={(e) => handleSummaryChange('grandTotal', e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="status-row">
          <h3>Items</h3>
          <button type="button" onClick={addEmptyRow}>
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
              {edited.items.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <input
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      placeholder="Item"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={item.quantity ?? ''}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      placeholder="1"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={item.price ?? ''}
                      onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                      placeholder="0.00"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={item.total ?? ''}
                      onChange={(e) => handleItemChange(idx, 'total', e.target.value)}
                      placeholder="0.00"
                    />
                  </td>
                </tr>
              ))}
              {edited.items.length === 0 && (
                <tr>
                  <td colSpan={4}>No items parsed yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="actions">
          <button type="button" onClick={handleSave}>
            Save / Confirm
          </button>
          {saveStatus && <div className="alert">{saveStatus}</div>}
        </div>
        <p className="footer-note">
          Training sample contains raw text, the automatic parse, and your corrections to continuously improve the
          model.
        </p>
      </div>
    </div>
  );
}
