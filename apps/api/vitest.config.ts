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
        miniflare: {
          compatibilityDate: "2024-10-22",
          compatibilityFlags: ["nodejs_compat"],
        },
        // Use test-entry.ts which exports TestRuntime with injected test dependencies
        // This avoids loading CloudflareNodeRegistry and heavy packages like geotiff
        main: "./src/test-entry.ts",
        singleWorker: true,
      },
    },
  },
});
