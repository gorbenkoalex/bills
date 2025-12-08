import type { LineClass } from '../types';

// The user requested a rules-only mode, so the ONNX classifier stays disabled.
// We still expose the same API shape to keep the parser code unchanged.
const rulesOnlyMessage = 'Model disabled: running in rules-only mode';

export async function loadLineClassifier(): Promise<void> {
  // Intentionally no-op to avoid fetching wasm/model assets.
  return Promise.resolve();
}

export function getModelStatus(): { loaded: boolean; error?: string } {
  return { loaded: false, error: rulesOnlyMessage };
}

export async function classifyLine(): Promise<LineClass> {
  // With no model we treat every line as OTHER so parsing relies on rules.
  return 'OTHER';
}
