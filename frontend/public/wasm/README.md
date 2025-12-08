# ONNX Runtime WebAssembly assets

Runtime wasm/mjs artifacts are now copied into `frontend/src/wasm/` so Vite can fingerprint them and avoid importing `/public` assets as modules. This README remains tracked to keep the folder present for older deployments that still expect `/public/wasm/`.

If you run an older build that fetches from `/wasm/`, place the ONNX Runtime wasm binaries and loader shims here. They are ignored by Git, but this README stays committed.
