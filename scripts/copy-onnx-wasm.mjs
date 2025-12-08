import fs from 'fs';
import path from 'path';

// Copies the onnxruntime-web wasm assets into the frontend public folder so
// the browser can load them with the correct MIME type. This avoids the
// "expected magic word" errors caused by HTML fallbacks on missing wasm files.
const root = path.resolve(new URL('.', import.meta.url).pathname, '..');
const sourceDir = path.resolve(root, 'node_modules', 'onnxruntime-web', 'dist');
// Assets live under public/ort so the runtime can fetch them directly without
// going through Vite's module pipeline.
const targetDir = path.resolve(root, 'frontend', 'public', 'ort');

// Copy both single-threaded and threaded ORT wasm artifacts so the runtime can
// fall back gracefully when workers/threads are disabled. We keep the list
// explicit to avoid pulling in unnecessary binaries.
const wasmFiles = [
  'ort-wasm.wasm',
  'ort-wasm-simd.wasm',
  'ort-wasm-threaded.wasm',
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.asyncify.wasm'
];

const moduleFiles = [
  'ort-wasm.mjs',
  'ort-wasm-simd.mjs',
  'ort-wasm-threaded.mjs',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.jsep.mjs',
  'ort-wasm-simd-threaded.asyncify.mjs'
];

const fallbackMap = {
  'ort-wasm.wasm': 'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd.wasm': 'ort-wasm-simd-threaded.wasm',
  'ort-wasm-threaded.wasm': 'ort-wasm-simd-threaded.wasm',
  'ort-wasm.mjs': 'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd.mjs': 'ort-wasm-simd-threaded.mjs',
  'ort-wasm-threaded.mjs': 'ort-wasm-simd-threaded.mjs'
};

if (!fs.existsSync(sourceDir)) {
  console.warn('onnxruntime-web is not installed; skipping wasm copy');
  process.exit(0);
}

fs.mkdirSync(targetDir, { recursive: true });

const missing = [];

function copyWithFallback(file) {
  const primary = path.join(sourceDir, file);
  const target = path.join(targetDir, file);
  if (fs.existsSync(primary)) {
    fs.copyFileSync(primary, target);
    console.log(`copied ${file}`);
    return true;
  }
  const fallback = fallbackMap[file];
  if (fallback) {
    const fallbackPath = path.join(sourceDir, fallback);
    if (fs.existsSync(fallbackPath)) {
      fs.copyFileSync(fallbackPath, target);
      console.log(`copied ${file} (fallback -> ${fallback})`);
      return true;
    }
  }
  return false;
}

for (const file of wasmFiles) {
  if (!copyWithFallback(file)) missing.push(file);
}

for (const file of moduleFiles) {
  if (!copyWithFallback(file)) missing.push(file);
}

if (missing.length) {
  console.warn('Missing wasm artifacts:', missing.join(', '));
}
