import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      // Deliberately not wrangler.test.jsonc: that config is shared with the
      // unit suite, and the remote Workers AI binding this suite needs would
      // make `pnpm test` require Cloudflare credentials.
      wrangler: {
        configPath: "./wrangler.integration.jsonc",
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
