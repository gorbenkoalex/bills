import type { TrainingSample } from '../types';

const API_BASE = '/api';

export async function saveTrainingSample(sample: TrainingSample): Promise<void> {
  const res = await fetch(`${API_BASE}/receipt-samples`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sample)
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || 'Failed to save training sample');
  }
}
