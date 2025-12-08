# ONNX Runtime WebAssembly assets

Runtime wasm/mjs artifacts are copied into this `frontend/public/wasm/` folder so the browser can fetch them directly with the
correct MIME type. Git ignores the binaries, but this README stays committed to keep the directory present.

If wasm loads fail, rerun `npm run copy:wasm` to repopulate the artifacts from `node_modules/onnxruntime-web/dist/`.
