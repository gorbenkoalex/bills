import type { LineClass } from './types';

// Stubbed model: rules-only mode per request.
const rulesOnlyMessage = 'Model disabled: running in rules-only mode';

export async function loadLineClassifier(): Promise<void> {
  return Promise.resolve();
}

export function getModelStatus(): { loaded: boolean; error?: string } {
  return { loaded: false, error: rulesOnlyMessage };
}

export async function classifyLine(): Promise<LineClass> {
  return 'OTHER';
}
