# Receipt parsing with ONNX + React

Browser-first receipt parsing that mixes rule-based heuristics with an ONNX line classifier. Users can upload receipts (JPG/PNG/HEIC/PDF) or paste OCR text, review the parsed result, edit any field, and submit corrected samples to a lightweight backend. Python scripts convert the collected samples into an updated ONNX model for the browser.

## Project layout
- `frontend/` – React + TypeScript app (Vite) with components for upload, summary, and items.
  - `src/components/` – `FileUpload`, `Summary`, `ItemsTable` UI pieces.
  - `src/services/` – `ocrStub`, `parser`, `aiModel`, `api`, `lineFeatures` logic.
  - `public/models/` – place `line_classifier.onnx` for the browser (output of training script).
- `server/` – Express server that stores each training example in `server/data/samples.jsonl` (one JSON object per line) and can serve the built frontend.
- `training/` – Python utilities to prepare the dataset and train/export the line classifier to ONNX.

## Prerequisites
- Node.js 18+
- Python 3.10+

## Frontend

### Install dependencies
```bash
npm install
```

### Run in dev mode
```bash
npm run dev
```
The app will be available on http://localhost:5173. The `predev` hook copies
`onnxruntime-web`'s `.wasm` runtime files into `frontend/public/wasm` so the
browser can load the model without MIME-type errors.

### Build for production
```bash
npm run build
```
The static assets are emitted into `dist/`. The `prebuild` hook also copies the
ONNX wasm artifacts for production hosting.

## Backend

### Start the API server
```bash
npm run server
```
- `POST /api/receipt-samples` appends a `TrainingSample` to `server/data/samples.jsonl`.
- `GET /api/health` returns `{ status: "ok" }`.

If `dist/` exists (after `npm run build`), the server also serves the built SPA so you can run everything from http://localhost:4000.

## Self-learning loop
1. Open the app, paste OCR text (or upload an image/PDF — OCR is stubbed but the flow is the same), and click **Parse**.
2. Review and edit store/date/total/items in the UI (all fields are editable React controls).
3. Click **Save / Confirm** to POST a `TrainingSample` with `rawText`, `parsedBefore`, and `parsedAfter` to the backend.
4. Repeat to accumulate real-world samples in `server/data/samples.jsonl`.

## Training the ONNX classifier
The training scripts consume the collected samples and produce `frontend/public/models/line_classifier.onnx`, which the browser loads via `onnxruntime-web`.

Create a virtual environment (recommended) and install Python dependencies:
```bash
pip install scikit-learn onnx skl2onnx numpy
```

Run training:
```bash
python -m training.train_line_classifier
```
This prints train/test accuracy and exports `line_classifier.onnx` into `frontend/public/models/`. Rebuild the frontend afterwards (`npm run build`) so the new model is available in production bundles.

## Feature parity between Python and browser
Both the Python scripts and the frontend use the same 11 numeric features per line in this order:
1. length
2. digitCount
3. alphaCount
4. spaceCount
5. digitRatio
6. alphaRatio
7. hasX (includes `x` and `×`)
8. hasStar
9. hasPercent
10. hasCurrency
11. priceLikeCount

Keep this order intact when experimenting so the model and browser agree on inputs.

## Notes
- The OCR layer is intentionally a stub; replace `frontend/src/services/ocrStub.ts` with Tesseract.js or any OCR service to automate extraction. The UI already handles JPG/PNG/HEIC/PDF upload flow.
- The parser works even if the ONNX model is missing, relying solely on regex/rule heuristics.
- Training samples are appended to a JSONL file for simplicity; rotate or move the file if it grows large.
