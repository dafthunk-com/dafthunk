declare module "cloudflare:test" {
  // Controls the type of `import("cloudflare:test").env`
  interface ProvidedEnv extends Env {
    AI: Ai;
    DB: D1Database;
    DATASETS_AUTORAG: string;
    CLOUDFLARE_ACCOUNT_ID: string;
    CLOUDFLARE_API_TOKEN: string;
  }
}

// WASM module declarations for Cloudflare Workers
// Import WASM files as ArrayBuffer (raw bytes), not as compiled modules
declare module "*.wasm" {
  const wasmBinary: ArrayBuffer;
  export default wasmBinary;
}
