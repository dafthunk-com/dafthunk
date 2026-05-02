import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const emptyStub = resolve(__dirname, "test/stubs/empty-module.ts");

export default defineConfig({
  resolve: {
    alias: {
      // Stub packages that can't be resolved in workerd test environment.
      // These are transitively imported but not exercised in tests.
      "@cloudflare/sandbox": emptyStub,
      "@cloudflare/containers": emptyStub,
      "@cf-wasm/photon": emptyStub,
      "@cf-wasm/png": emptyStub,
      "@cf-wasm/resvg": emptyStub,
    },
  },
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: "./wrangler.test.jsonc",
      },
      // Use test-entry.ts which exports TestRuntime with injected test dependencies
      // This avoids loading CloudflareNodeRegistry and heavy packages like geotiff
      main: "./src/test-entry.ts",
    }),
  ],
  test: {
    setupFiles: ["./test/setup.ts"],
    testTimeout: 30000,
  },
});
