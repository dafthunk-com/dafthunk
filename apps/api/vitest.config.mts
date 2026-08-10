import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const emptyStub = resolve(__dirname, "test/stubs/empty-module.ts");

// The real schema, for the few suites that exercise D1-backed paths (the
// workflow agent's connect guard reads the workflows table). Applied per test
// file via `applyD1Migrations` in a beforeAll — not globally, so the many
// suites that never touch D1 stay exactly as they were.
const migrations = await readD1Migrations(
  resolve(__dirname, "src/db/migrations")
);

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
      // twilio's CJS bundle `require("node:os")` which vitest-pool-workers
      // does not expose; the TwilioSmsNode it backs is not exercised here.
      twilio: emptyStub,
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
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: migrations,
        },
      },
    }),
  ],
  test: {
    setupFiles: ["./test/setup.ts"],
    testTimeout: 30000,
  },
});
