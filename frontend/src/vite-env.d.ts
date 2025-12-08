/// <reference types="vite/client" />

declare module '*.wasm' {
  const src: string;
  export default src;
}

declare module '*.mjs' {
  const src: string;
  export default src;
}
