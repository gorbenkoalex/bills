import type { TrainingSample } from '../types';

const API_BASE = '/api';

export async function saveTrainingSample(sample: TrainingSample): Promise<void> {
  const response = await fetch(`${API_BASE}/receipt-samples`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sample)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Unable to save training sample');
  }
}
