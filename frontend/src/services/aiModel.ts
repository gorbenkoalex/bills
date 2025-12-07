import * as ort from 'onnxruntime-web';
import { extractLineFeatures } from './lineFeatures';
import type { LineClass } from '../types';

const MODEL_URL = '/models/line_classifier.onnx';
const LABELS: LineClass[] = ['ITEM', 'OTHER', 'TOTAL'];

// Point the wasm loader to the public assets we copy during dev/build so the
// runtime fetches .wasm files instead of the HTML fallback that causes
// "expected magic word" errors.
ort.env.wasm.wasmPaths = '/wasm';

let session: ort.InferenceSession | null = null;
let modelError: string | null = null;

// Load the ONNX model once. When unavailable we keep working in rules-only mode.
export async function loadLineClassifier(): Promise<void> {
  if (session || modelError) return;
  try {
    session = await ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ['wasm']
    });
  } catch (err) {
    console.warn('Could not load ONNX model, falling back to rules only', err);
    modelError = (err as Error).message;
  }
}

export function getModelStatus(): { loaded: boolean; error?: string } {
  return { loaded: Boolean(session), error: modelError || undefined };
}

export async function classifyLine(line: string): Promise<LineClass> {
  if (!session) return 'OTHER';
  const features = extractLineFeatures(line.trim());
  const input = new ort.Tensor('float32', Float32Array.from(features), [1, features.length]);
  const outputs = await session.run({ input });
  const outputName =
    session.outputNames.find((name) => {
      const tensor = outputs[name] as ort.Tensor;
      return tensor?.data instanceof Float32Array;
    }) ?? session.outputNames[0];
  const probabilities = outputs[outputName] as ort.Tensor;
  const scores = Array.from(probabilities.data as Float32Array);
  const bestIndex = scores.indexOf(Math.max(...scores));
  return LABELS[bestIndex] ?? 'OTHER';
}
