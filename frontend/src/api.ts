import type { TrainingSample } from './types';

const API_URL = '/api/receipt-samples';

export async function saveTrainingSample(sample: TrainingSample): Promise<void> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sample)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to save sample');
  }
}
