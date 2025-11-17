import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    setupFiles: ["./test/setup.ts"],
    testTimeout: 30000,
    poolOptions: {
      workers: {
        wrangler: {
          configPath: "./wrangler.test.jsonc",
        },
        // Use test-entry.ts which exports TestRuntime with injected test dependencies
        // This avoids loading CloudflareNodeRegistry and heavy packages like geotiff
        main: "./src/test-entry.ts",
        singleWorker: true,
        // Use isolated local mode in CI to avoid authentication errors
        isolatedStorage: true,
        miniflare: {
          compatibilityDate: "2025-01-01",
        },
      },
    },
  },
});
