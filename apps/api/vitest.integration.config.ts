import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    include: ["**/*.integration.?(c|m)[jt]s?(x)"],
    setupFiles: ["./test/setup.ts"],
    testTimeout: 30000,
    poolOptions: {
      workers: {
        wrangler: {
          configPath: "./wrangler.test.jsonc",
        },
        singleWorker: true,
        isolatedStorage: false,
      },
    },
  },
});
