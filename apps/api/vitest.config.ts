import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    setupFiles: ["./test/setup.ts"],
    testTimeout: 30000,
    poolOptions: {
      workers: {
        wrangler: {
          configPath: "./wrangler.jsonc",
        },
        // Use test-entry.ts which exports TestRuntime with injected test dependencies
        // This avoids loading CloudflareNodeRegistry and heavy packages like geotiff
        main: "./src/test-entry.ts",
        singleWorker: true,
        isolatedStorage: true,
        miniflare: {
          // Override to force local mode and skip remote-only bindings
          workers: [
            {
              // Disable AI, Workflows, Analytics Engine, Browser in tests
              bindings: {
                AI: undefined,
                EXECUTE: undefined,
                COMPUTE: undefined,
                EXECUTIONS: undefined,
                BROWSER: undefined,
              },
            },
          ],
        },
      },
    },
  },
});
