import type { TrainingSample } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

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
