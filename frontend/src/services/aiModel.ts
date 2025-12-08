import * as ort from 'onnxruntime-web';
import { extractLineFeatures } from './lineFeatures';
import type { LineClass, ModelMode, ModelRunMetadata, RawReceiptInput } from '../types';

export interface InferenceConfig {
  liveModelPath: string;
  localModelPath: string;
  mode: ModelMode;
  liveVersion?: string;
  localVersion?: string;
}

const defaultConfig: InferenceConfig = {
  liveModelPath: '/models/receipt_parser_live.onnx',
  localModelPath: '/models/receipt_parser_local.onnx',
  mode: 'live',
  liveVersion: '1.0.0',
  localVersion: '0.0.0'
};

// Serve ORT directly from the public/wasm folder so the browser fetches the
// real binaries with the correct MIME type instead of Vite attempting to
// transform them as modules. This prevents "expected magic word" failures when
// HTML is returned for wasm requests.
const wasmBasePath = '/wasm/';
ort.env.wasm.wasmPaths = {
  'ort-wasm.wasm': `${wasmBasePath}ort-wasm.wasm`,
  'ort-wasm-simd.wasm': `${wasmBasePath}ort-wasm-simd.wasm`,
  'ort-wasm.jsep.wasm': `${wasmBasePath}ort-wasm.jsep.wasm`,
  'ort-wasm-simd.jsep.wasm': `${wasmBasePath}ort-wasm-simd.jsep.wasm`,
  'ort-wasm.mjs': `${wasmBasePath}ort-wasm.mjs`,
  'ort-wasm-simd.mjs': `${wasmBasePath}ort-wasm-simd.mjs`,
  'ort-wasm.jsep.mjs': `${wasmBasePath}ort-wasm.jsep.mjs`,
  'ort-wasm-simd.jsep.mjs': `${wasmBasePath}ort-wasm-simd.jsep.mjs`,
  'ort-wasm-simd-threaded.wasm': `${wasmBasePath}ort-wasm-simd-threaded.wasm`,
  'ort-wasm-simd-threaded.jsep.wasm': `${wasmBasePath}ort-wasm-simd-threaded.jsep.wasm`,
  'ort-wasm-simd-threaded.asyncify.wasm': `${wasmBasePath}ort-wasm-simd-threaded.asyncify.wasm`,
  'ort-wasm-simd-threaded.mjs': `${wasmBasePath}ort-wasm-simd-threaded.mjs`,
  'ort-wasm-simd-threaded.jsep.mjs': `${wasmBasePath}ort-wasm-simd-threaded.jsep.mjs`,
  'ort-wasm-simd-threaded.asyncify.mjs': `${wasmBasePath}ort-wasm-simd-threaded.asyncify.mjs`
} as unknown as Record<string, string>;
// Disable the proxy worker and threads to keep the runtime on the main thread.
ort.env.wasm.proxy = false;
ort.env.wasm.numThreads = 1;

const sessions: Partial<Record<'live' | 'local', ort.InferenceSession>> = {};
const sessionErrors: Partial<Record<'live' | 'local', string>> = {};

function getOutputClass(index: number): LineClass {
  switch (index) {
    case 0:
      return 'ITEM';
    case 1:
      return 'TOTAL';
    default:
      return 'OTHER';
  }
}

async function loadSession(kind: 'live' | 'local', path: string): Promise<void> {
  if (sessions[kind]) return;
  try {
    sessions[kind] = await ort.InferenceSession.create(path, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all'
    });
    sessionErrors[kind] = undefined;
  } catch (err) {
    sessionErrors[kind] = (err as Error).message;
  }
}

export function getModelStatuses() {
  return {
    live: { loaded: Boolean(sessions.live), error: sessionErrors.live },
    local: { loaded: Boolean(sessions.local), error: sessionErrors.local }
  };
}

async function classifyLinesWithSession(
  kind: 'live' | 'local',
  raw: RawReceiptInput,
  config: InferenceConfig
): Promise<LineClass[]> {
  const session = sessions[kind];
  if (!session) {
    throw new Error(`${kind} model is not loaded`);
  }

  const features = raw.lines.map((line) => extractLineFeatures(line));
  const tensor = new ort.Tensor('float32', Float32Array.from(features.flat()), [features.length, features[0].length]);
  const feeds: Record<string, ort.Tensor> = { input: tensor };
  const results = await session.run(feeds);
  const output = (results.label || results.output_label || results.output)?.data as any;
  if (!output) {
    throw new Error('Model returned no label output');
  }
  const labels: LineClass[] = [];
  const rawLabels: number[] = Array.from(output as any);
  for (const idx of rawLabels) {
    labels.push(getOutputClass(Number(idx)));
  }
  // Metadata can travel in the result to aid downstream storage.
  return labels;
}

export function buildMetadata(kind: 'live' | 'local', mode: ModelMode, config: InferenceConfig): ModelRunMetadata {
  const version = kind === 'live' ? config.liveVersion : config.localVersion;
  const modelPath = kind === 'live' ? config.liveModelPath : config.localModelPath;
  return {
    modelId: kind,
    modelPath,
    modelVersion: version,
    modeUsed: mode,
    runAt: new Date().toISOString()
  };
}

export async function ensureModels(config: Partial<InferenceConfig> = {}): Promise<InferenceConfig> {
  const merged = { ...defaultConfig, ...config };
  await Promise.all([
    loadSession('live', merged.liveModelPath),
    merged.mode !== 'live' ? loadSession('local', merged.localModelPath) : Promise.resolve()
  ]);
  return merged;
}

export async function runModel(
  kind: 'live' | 'local',
  raw: RawReceiptInput,
  config: InferenceConfig
): Promise<LineClass[]> {
  if (!sessions[kind]) {
    await loadSession(kind, kind === 'live' ? config.liveModelPath : config.localModelPath);
  }
  return classifyLinesWithSession(kind, raw, config);
}

export function getDefaultConfig(): InferenceConfig {
  return { ...defaultConfig };
}
