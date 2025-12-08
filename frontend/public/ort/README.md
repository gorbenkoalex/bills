ONNX Runtime wasm/mjs artifacts belong in this folder so the browser can fetch them via `/ort/...` URLs.

Populate the files by running `npm run copy:wasm`, which copies from `node_modules/onnxruntime-web/dist/`. The runtime expects at least:
- ort-wasm.wasm / ort-wasm.mjs
- ort-wasm-simd.wasm / ort-wasm-simd.mjs
- ort-wasm-threaded.wasm / ort-wasm-threaded.mjs
- ort-wasm-simd-threaded.wasm / ort-wasm-simd-threaded.mjs

If you clean dependencies or see MIME errors for `/ort/ort-wasm*.wasm`/`.mjs`, rerun the copy script.
