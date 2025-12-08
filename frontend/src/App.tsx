import { useEffect, useMemo, useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { Summary } from './components/Summary';
import { ItemsTable } from './components/ItemsTable';
import { parseReceipt } from './services/parser';
import { extractRawRepresentation, buildRawInputFromText } from './services/rawInput';
import { saveTrainingSample } from './services/api';
import type { ModelMode, ModelRunResult, ParsedItem, ParsedReceipt, RawReceiptInput, TrainingSample } from './types';
import { getModelStatuses, ensureModels } from './services/aiModel';

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
  const [rawInput, setRawInput] = useState<RawReceiptInput | null>(null);
  const [parsingResult, setParsingResult] = useState<{ active: ModelRunResult; live?: ModelRunResult; local?: ModelRunResult } | null>(
    null
  );
  const [edited, setEdited] = useState<ParsedReceipt>(emptyReceipt);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [mode, setMode] = useState<ModelMode>('live');
  const [activeModelId, setActiveModelId] = useState<'live' | 'local'>('live');
  const [modelStatus, setModelStatus] = useState(getModelStatuses());

  useEffect(() => {
    ensureModels({ mode }).then(() => setModelStatus(getModelStatuses()));
  }, [mode]);

  const baseModelOutput = useMemo(() => {
    if (!parsingResult) return null;
    if (mode === 'ensemble') {
      return activeModelId === 'live' ? parsingResult.live ?? parsingResult.active : parsingResult.local ?? parsingResult.active;
    }
    return parsingResult.active;
  }, [parsingResult, mode, activeModelId]);

  useEffect(() => {
    if (mode === 'ensemble' && parsingResult) {
      const target =
        activeModelId === 'live' ? parsingResult.live ?? parsingResult.active : parsingResult.local ?? parsingResult.active;
      setEdited(target.parsed);
    }
  }, [activeModelId, mode, parsingResult]);

  const handleParse = async () => {
    setLoading(true);
    setSaveStatus(null);
    try {
      let currentRaw: RawReceiptInput | null = null;
      let text = rawText.trim();
      if (!text && file) {
        currentRaw = await extractRawRepresentation(file);
        text = currentRaw.rawText;
        setRawText(text);
      }
      if (!currentRaw) {
        if (!text) throw new Error('Provide raw text or upload a receipt first.');
        currentRaw = buildRawInputFromText(text, file ? { fileName: file.name, mimeType: file.type } : undefined);
      }
      setRawInput(currentRaw);

      const parsed = await parseReceipt(currentRaw, mode);
      setParsingResult(parsed);
      setActiveModelId(mode === 'local' ? 'local' : 'live');
      setEdited(parsed.active.parsed);
    } catch (err) {
      setSaveStatus((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index: number, key: keyof ParsedItem, value: string) => {
    setEdited((current) => {
      const nextItems = [...current.items];
      const numeric = ['quantity', 'price', 'total'].includes(key as string) ? Number(value) : value;
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

  const handleSave = async (wasEdited: boolean) => {
    if (!rawInput || !baseModelOutput) {
      setSaveStatus('Nothing to save yet. Please parse a receipt first.');
      return;
    }

    const sample: TrainingSample = {
      rawInput,
      modelOutput: baseModelOutput,
      alternativeOutputs: {
        live: parsingResult?.live,
        local: parsingResult?.local
      },
      userCorrected: edited,
      modelMetadata: baseModelOutput.metadata,
      sourceInfo: { ...rawInput.source, wasEdited },
      createdAt: new Date().toISOString()
    };

    try {
      await saveTrainingSample(sample);
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

  const modelLabel = () => {
    const liveLabel = modelStatus.live.loaded ? 'Live model ready' : `Live pending${modelStatus.live.error ? ` (${modelStatus.live.error})` : ''}`;
    const localLabel = modelStatus.local.loaded
      ? 'Local model ready'
      : `Local pending${modelStatus.local.error ? ` (${modelStatus.local.error})` : ''}`;
    if (mode === 'live') return liveLabel;
    if (mode === 'local') return localLabel;
    return `${liveLabel} | ${localLabel}`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <div className="card space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Receipt parser (ONNX + rules)</h1>
              <p className="text-sm text-slate-600">
                Upload JPG/PNG/HEIC/PDF or paste OCR text. Run the live/local ONNX model, edit fields, and send corrections for
                continuous training.
              </p>
            </div>
            <span className="badge">{modelLabel()}</span>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <span className="font-medium">Model mode:</span>
              <select className="input-field py-1" value={mode} onChange={(e) => setMode(e.target.value as ModelMode)}>
                <option value="live">Live</option>
                <option value="local">Local</option>
                <option value="ensemble">Compare</option>
              </select>
            </label>
            {mode === 'ensemble' && (
              <label className="flex items-center gap-2">
                <span className="font-medium">Active view:</span>
                <select
                  className="input-field py-1"
                  value={activeModelId}
                  onChange={(e) => setActiveModelId(e.target.value as 'live' | 'local')}
                >
                  <option value="live">Live output</option>
                  <option value="local">Local output</option>
                </select>
              </label>
            )}
          </div>
        </div>

        <FileUpload
          onFileSelected={setFile}
          rawText={rawText}
          onRawTextChange={setRawText}
          onParse={handleParse}
          loading={loading}
          modelLabel={modelLabel()}
        />

        <Summary
          storeName={edited.storeName}
          purchaseDate={edited.purchaseDate}
          grandTotal={edited.grandTotal}
          onChange={handleSummaryChange}
        />

        <ItemsTable items={edited.items} onItemChange={handleItemChange} onAddRow={addEmptyRow} />

        <div className="card space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <button type="button" className="primary-btn" onClick={() => handleSave(false)}>
                Accept as correct
              </button>
              <button type="button" className="secondary-btn" onClick={() => handleSave(true)}>
                Save with corrections
              </button>
            </div>
            {saveStatus && <div className="text-sm text-slate-700">{saveStatus}</div>}
          </div>
          <p className="text-sm text-slate-600">
            Training samples bundle the raw input, model output (live/local), and your edits so the offline training pipeline can
            fine-tune a local model.
          </p>
        </div>
      </div>
    </div>
  );
}
