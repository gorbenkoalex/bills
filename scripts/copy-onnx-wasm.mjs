import fs from 'fs';
import path from 'path';

// Copies the onnxruntime-web wasm assets into the frontend public folder so
// the browser can load them with the correct MIME type. This avoids the
// "expected magic word" errors caused by HTML fallbacks on missing wasm files.
const root = path.resolve(new URL('.', import.meta.url).pathname, '..');
const sourceDir = path.resolve(root, 'node_modules', 'onnxruntime-web', 'dist');
const targetDir = path.resolve(root, 'frontend', 'src', 'wasm');

// The packaged onnxruntime-web build currently ships threaded SIMD artifacts
// only. We copy the threaded wasm binaries and their accompanying .mjs shims
// into `frontend/src/wasm` so Vite can fingerprint and serve them as static
// assets without attempting to transform imports from /public.
const wasmFiles = [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.asyncify.wasm'
];

const moduleFiles = [
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.jsep.mjs',
  'ort-wasm-simd-threaded.asyncify.mjs'
];

if (!fs.existsSync(sourceDir)) {
  console.warn('onnxruntime-web is not installed; skipping wasm copy');
  process.exit(0);
}

fs.mkdirSync(targetDir, { recursive: true });

const missing = [];
for (const file of wasmFiles) {
  const from = path.join(sourceDir, file);
  const to = path.join(targetDir, file);
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, to);
    console.log(`copied ${file}`);
  } else {
    missing.push(file);
  }
}

for (const file of moduleFiles) {
  const from = path.join(sourceDir, file);
  const to = path.join(targetDir, file);
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, to);
    console.log(`copied ${file}`);
  } else {
    missing.push(file);
  }
}

if (missing.length) {
  console.warn('Missing wasm artifacts:', missing.join(', '));
}
