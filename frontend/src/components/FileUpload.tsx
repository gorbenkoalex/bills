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
    <div className="card space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="label-text" htmlFor="file">
            Upload receipt (JPG, PNG, HEIC, PDF)
          </label>
          <input
            id="file"
            type="file"
            className="input-field"
            accept="image/jpeg,image/png,image/heic,application/pdf"
            onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-slate-600">
            Files are processed client-side. OCR is mocked for now, so pasted text also works.
          </p>
        </div>
        <div className="space-y-2">
          <label className="label-text" htmlFor="raw">
            Raw text
          </label>
          <textarea
            id="raw"
            className="input-field min-h-[160px] resize-y"
            value={rawText}
            onChange={(e) => onRawTextChange(e.target.value)}
            placeholder="Paste OCR text or type here"
          />
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button className="primary-btn" onClick={onParse} disabled={loading}>
          {loading ? 'Parsing…' : 'Parse'}
        </button>
        <span className="badge">{modelLabel}</span>
      </div>
    </div>
  );
};
