import path from "node:path";
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

const emptyStub = path.resolve(__dirname, "test/stubs/empty-module.ts");

export default defineWorkersConfig({
  resolve: {
    alias: {
      // @cloudflare/sandbox imports @cloudflare/containers which workerd
      // cannot resolve at runtime. Stubbing both avoids module resolution
      // failures in tests that don't exercise these bindings.
      "@cloudflare/sandbox": emptyStub,
      "@cloudflare/containers": emptyStub,
    },
  },
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
        isolatedStorage: true,
      },
    },
  },
});
