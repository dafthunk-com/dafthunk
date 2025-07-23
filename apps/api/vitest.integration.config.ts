import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    include: ["**/*.integration.?(c|m)[jt]s?(x)"],
    setupFiles: ["./test/setup.ts"],
    testTimeout: 25000,
    poolOptions: {
      workers: {
        wrangler: {
          configPath: "./wrangler.jsonc",
        },
        isolatedStorage: false,
      },
    },
  },
});
