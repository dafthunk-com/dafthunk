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
    // No `retry` here on purpose: when the pool's remote binding proxy drops
    // ("Network connection lost.") the connection stays dead for that worker,
    // so every retry fails too. See the testing note in src/templates/README.md.
  },
});
