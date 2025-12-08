# Receipt parsing demo (React + Tailwind + onnxruntime-web)

Browser-first receipt parsing with a real ONNX classifier, dual-model (live/local) switching, editable fields, and a JSONL training pipeline to keep improving the model from user feedback. Users can upload receipts (JPG/PNG/HEIC/PDF) or paste OCR text, review the parsed result, fix mistakes, and save the full parsing context to the backend for future training.

## Project layout
- `frontend/` – React + TypeScript app (Vite) styled with TailwindCSS.
  - `src/components/` – `FileUpload`, `Summary`, `ItemsTable` UI pieces.
  - `src/services/` – raw input extraction (`rawInput.ts`), ONNX inference (`aiModel.ts`), hybrid parsing (`parser.ts`), API client, and shared `lineFeatures`.
  - `public/models/` – expected location for `receipt_parser_live.onnx` and `receipt_parser_local.onnx` used by `onnxruntime-web` (models are **not** committed; generate or download them before running).
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
This automatically copies the ONNX Runtime wasm and loader `.mjs` files into `frontend/src/wasm/`. Vite fingerprints those assets and the runtime loads them by URL mapping (no `/public` imports), which avoids the "should not be imported from source" errors seen when the `.mjs` shims are fetched directly. If you clean `node_modules` or see MIME-type errors for `/assets/ort-wasm-*.mjs` / `.wasm`, rerun:
```bash
npm run copy:wasm
```

### Run in dev mode
```bash
npm run dev
```
The app will be available on http://localhost:5173.

### Build for production
```bash
npm run build
```
The static assets are emitted into `dist/`.

## Backend

### Start the API server
```bash
npm run server
```
- `POST /api/receipt-samples` appends a `TrainingSample` to `server/data/samples.jsonl`.
- `GET /api/health` returns `{ status: "ok" }`.

If `dist/` exists (after `npm run build`), the server also serves the built SPA so you can run everything from http://localhost:4000.

## Self-learning loop
1. Open the app, paste OCR text or upload JPG/PNG/HEIC/PDF and click **Parse**.
2. The browser loads `receipt_parser_live.onnx` (and optionally `receipt_parser_local.onnx`) via `onnxruntime-web`, classifies each line, and combines model output with regex/rule parsing to show store/date/total/items.
3. Pick which model to view (Live / Local / Compare). In Compare mode you can flip between outputs.
4. Edit any field. Use **Accept as correct** to store confirmed parses or **Save with corrections** to flag a bad parse and capture your fixes.
5. Each save POSTs a `TrainingSample` with `rawInput` (text + source info), `modelOutput`, optional alternative model outputs, and `userCorrected` into `server/data/samples.jsonl`.
6. Periodically run the training scripts to produce a refreshed `receipt_parser_local.onnx`, copy it to `frontend/public/models/`, and reload the app to test the improved local model.

## Training the ONNX classifier
The training scripts consume the collected samples and export two ONNX models (live + local) so the browser can compare them.

> Note: ONNX artifacts are ignored by git. Run the training script or place provided models into `frontend/public/models/` before
> starting the app; otherwise the runtime will fall back to rules-only parsing with warnings.

Create a virtual environment (recommended) and install Python dependencies:
```bash
pip install scikit-learn onnx skl2onnx numpy
```

Run training:
```bash
python -m training.train_line_classifier
```
This prints train/test accuracy and exports `receipt_parser_live.onnx` and `receipt_parser_local.onnx` into `frontend/public/models/`. Rebuild the frontend afterwards (`npm run build`) so the new model is available in production bundles.

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
- Styling uses TailwindCSS; adjust utility classes or extend `frontend/src/index.css` as needed.
- OCR is kept minimal in `rawInput.ts` (pdf.js for PDFs, file->text stub for images). Swap in a real OCR pipeline without changing the rest of the flow.
- Training samples append to a JSONL file for simplicity; rotate or move the file if it grows large.
- Dual-model support: switch between live/local/compare using the top-left selector. Compare mode shows both models and lets you decide which output to edit/send.

## Reducing merge conflicts
- Lockfiles use a union merge strategy via `.gitattributes` to minimize conflicts when dependency trees change across branches.
- Generated assets remain untracked (`dist/`, runtime wasm/mjs artifacts under `frontend/src/wasm/`, ONNX models). Run `npm run build` and the helper copy scripts after pulling instead of committing build output.
- The `frontend/public/wasm/README.md` stays tracked so the folder exists; only the runtime artifacts are ignored. This avoids Git treating documentation files as binary and prevents "binary files not supported" errors when diffing.
- If you still hit conflicts, prefer recreating local artifacts (copy wasm/model files, rebuild) rather than merging generated content.
