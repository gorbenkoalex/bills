import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { RawReceiptInput } from '../types';

// Configure pdf.js worker to load from the locally served asset to avoid CDN
// failures and MIME-type issues.
GlobalWorkerOptions.workerSrc = GlobalWorkerOptions.workerSrc || workerSrc;

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const content = await page.getTextContent();
  const lines = content.items
    .map((item: any) => ('str' in item ? item.str : ''))
    .filter(Boolean)
    .join('\n');
  return lines;
}

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsText(file);
  });
}

export async function extractRawRepresentation(file: File): Promise<RawReceiptInput> {
  const mimeType = file.type;
  const uploadedAt = new Date().toISOString();
  let rawText = '';

  if (mimeType === 'application/pdf') {
    rawText = await extractPdfText(file);
  } else {
    // For images or unknown formats we keep this stub to allow manual override; replace with OCR later.
    rawText = await readFileAsText(file).catch(() => '');
    if (!rawText) {
      rawText = 'Image-to-text OCR stub. Replace with real OCR and re-run parsing.';
    }
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    rawText,
    lines,
    source: { fileName: file.name, mimeType, uploadedAt }
  };
}

export function buildRawInputFromText(text: string, source?: { fileName?: string; mimeType?: string }): RawReceiptInput {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return {
    rawText: text,
    lines,
    source: {
      ...source,
      uploadedAt: new Date().toISOString()
    }
  };
}
