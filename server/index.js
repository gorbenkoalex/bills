import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

const dataDir = path.join(__dirname, 'data');
const samplesFile = path.join(dataDir, 'samples.jsonl');

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/receipt-samples', (req, res) => {
  const sample = req.body;
  if (!sample || typeof sample !== 'object') {
    return res.status(400).send('Invalid payload');
  }

  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const line = JSON.stringify(sample);
    fs.appendFileSync(samplesFile, `${line}\n`, 'utf-8');
    res.status(201).json({ status: 'saved' });
  } catch (err) {
    console.error('Failed to persist sample', err);
    res.status(500).send('Unable to save sample');
  }
});

const distPath = path.resolve(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
