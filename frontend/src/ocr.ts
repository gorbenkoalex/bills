/**
 * Placeholder OCR that echoes a friendly message. In a real deployment you can
 * swap this with Tesseract.js or a hosted OCR service.
 */
export async function runOcr(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const hint = name.endsWith('.pdf')
    ? 'PDF detected. Extracted text placeholder.'
    : 'Image detected. Extracted text placeholder.';
  return `${hint}\nPlease paste the receipt text into the editor to refine parsing.`;
}
