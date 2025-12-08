import * as ort from 'onnxruntime-web';
// Vite needs explicit imports so the wasm/mjs assets are fingerprinted and
// served as static files instead of being treated as module transforms from
// /public. We map each ORT artifact to a hashed URL via `?url` imports.
import wasmThreaded from '../wasm/ort-wasm-simd-threaded.wasm?url';
import wasmThreadedJsep from '../wasm/ort-wasm-simd-threaded.jsep.wasm?url';
import wasmThreadedAsyncify from '../wasm/ort-wasm-simd-threaded.asyncify.wasm?url';
import moduleThreaded from '../wasm/ort-wasm-simd-threaded.mjs?url';
import moduleThreadedJsep from '../wasm/ort-wasm-simd-threaded.jsep.mjs?url';
import moduleThreadedAsyncify from '../wasm/ort-wasm-simd-threaded.asyncify.mjs?url';
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

// Direct each expected ORT artifact to the fingerprinted asset URL Vite
// produces so no /public imports happen at runtime. This prevents Vite from
// throwing "should not be imported from source" errors for the `.mjs` shims.
ort.env.wasm.wasmPaths = {
  'ort-wasm-simd-threaded.wasm': wasmThreaded,
  'ort-wasm-simd-threaded.jsep.wasm': wasmThreadedJsep,
  'ort-wasm-simd-threaded.asyncify.wasm': wasmThreadedAsyncify,
  'ort-wasm-simd-threaded.mjs': moduleThreaded,
  'ort-wasm-simd-threaded.jsep.mjs': moduleThreadedJsep,
  'ort-wasm-simd-threaded.asyncify.mjs': moduleThreadedAsyncify
} as unknown as Record<string, string>;
// Disable the proxy worker and threads to keep the runtime on the main thread
// and avoid worker/JSEP module fetches that Vite would try to transform.
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
