import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: "./wrangler.test.jsonc",
      },
    }),
  ],
  test: {
    include: ["**/*.integration.?(c|m)[jt]s?(x)"],
    setupFiles: ["./test/setup.ts"],
    testTimeout: 30000,
  },
});
