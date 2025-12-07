import React from 'react';

interface Props {
  onFileSelected: (file: File | null) => void;
  rawText: string;
  onRawTextChange: (value: string) => void;
  onParse: () => void;
  loading: boolean;
  modelLabel: string;
}

export const FileUpload: React.FC<Props> = ({
  onFileSelected,
  rawText,
  onRawTextChange,
  onParse,
  loading,
  modelLabel
}) => {
  return (
    <div className="card">
      <div className="grid">
        <div>
          <label htmlFor="file">Upload receipt (JPG, PNG, HEIC, PDF)</label>
          <input
            id="file"
            type="file"
            accept="image/jpeg,image/png,image/heic,application/pdf"
            onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
          />
          <p className="muted">Files are processed client-side. OCR is mocked for now, so pasted text also works.</p>
        </div>
        <div>
          <label htmlFor="raw">Raw text</label>
          <textarea
            id="raw"
            value={rawText}
            onChange={(e) => onRawTextChange(e.target.value)}
            placeholder="Paste OCR text or type here"
          />
        </div>
      </div>
      <div className="actions" style={{ marginTop: 12 }}>
        <button onClick={onParse} disabled={loading}>
          {loading ? 'Parsing…' : 'Parse'}
        </button>
        <span className="badge">{modelLabel}</span>
      </div>
    </div>
  );
};
