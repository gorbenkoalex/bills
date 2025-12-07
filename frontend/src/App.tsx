import { useEffect, useState } from 'react';
import './styles.css';
import { FileUpload } from './components/FileUpload';
import { Summary } from './components/Summary';
import { ItemsTable } from './components/ItemsTable';
import { loadLineClassifier, getModelStatus } from './services/aiModel';
import { parseReceipt } from './services/parser';
import { extractRawTextFromFile } from './services/ocrStub';
import { saveTrainingSample } from './services/api';
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
        text = await extractRawTextFromFile(file);
        setRawText(text);
      }
      if (!text) {
        throw new Error('Provide raw text or upload a receipt first.');
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

  const modelLabel = modelStatus.loaded
    ? 'Model: ONNX loaded'
    : `Model: rules only${modelStatus.error ? ` (${modelStatus.error})` : ''}`;

  return (
    <div className="app-shell">
      <div className="card">
        <h1>Receipt parser with ONNX + rules</h1>
        <p className="footer-note">
          Upload JPG/PNG/HEIC/PDF or paste OCR text, parse, edit, and confirm to build a better model over time.
        </p>
      </div>

      <FileUpload
        onFileSelected={setFile}
        rawText={rawText}
        onRawTextChange={setRawText}
        onParse={handleParse}
        loading={loading}
        modelLabel={modelLabel}
      />

      <Summary
        storeName={edited.storeName}
        purchaseDate={edited.purchaseDate}
        grandTotal={edited.grandTotal}
        onChange={handleSummaryChange}
      />

      <ItemsTable items={edited.items} onItemChange={handleItemChange} onAddRow={addEmptyRow} />

      <div className="card">
        <div className="actions">
          <button type="button" onClick={handleSave}>
            Save / Confirm
          </button>
          {saveStatus && <div className="alert">{saveStatus}</div>}
        </div>
        <p className="footer-note">
          Training sample contains raw text, the automatic parse, and your corrections to continuously improve the model.
        </p>
      </div>
    </div>
  );
}
