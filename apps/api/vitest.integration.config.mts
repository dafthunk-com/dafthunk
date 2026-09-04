import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { configDefaults, defineConfig } from "vitest/config";

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
    /**
     * The billed sweeps, which are manual actions and only manual actions.
     *
     * Each of these makes real model calls by the hundred — the generation
     * benchmark alone spent 910k input tokens on its last recorded sweep — and
     * each already has its own config and its own named script. Left to the
     * glob above they were also swept by `test:integration`, so a command that
     * reads as "run the integration specs" quietly started a full generation
     * benchmark. Nothing here is lost by excluding them: the named script is
     * how you run one, and running one should always be a decision.
     */
    exclude: [
      ...configDefaults.exclude,
      "**/benchmark.integration.ts", // pnpm benchmark:generate
      "**/brief-benchmark.integration.ts", // pnpm benchmark:brief
      "**/evaluation.integration.ts", // pnpm eval:generate
      "**/model-probe.integration.ts", // pnpm eval:probe
    ],
    setupFiles: ["./test/setup.ts"],
    testTimeout: 30000,
    // No `retry` here on purpose: when the pool's remote binding proxy drops
    // ("Network connection lost.") the connection stays dead for that worker,
    // so every retry fails too. See the testing note in src/templates/README.md.
  },
});
