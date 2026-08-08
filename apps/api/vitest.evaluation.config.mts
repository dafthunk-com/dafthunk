import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const emptyStub = resolve(__dirname, "test/stubs/empty-module.ts");

/**
 * Config for the generator evaluation.
 *
 * Neither of the other two fits. The integration config exists for specs that
 * run real Workers AI models, so it carries a remote `AI` binding and loads the
 * genuine wasm packages — and loading those in workerd segfaults the pool the
 * moment the full node registry is built, which is the first thing this
 * benchmark does. The unit config has the right stubs but is the suite CI runs,
 * and this makes billed model calls.
 *
 * What the benchmark actually needs is narrow: the node catalog's *metadata*,
 * and outbound HTTPS to the AI Gateway. It stubs `save` and `run`, so no node
 * is ever executed and the wasm behind the image nodes is never reached — only
 * their `nodeType` declarations matter, and those survive the stub.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@cloudflare/sandbox": emptyStub,
      "@cloudflare/containers": emptyStub,
      "@cf-wasm/photon": emptyStub,
      "@cf-wasm/png": emptyStub,
      "@cf-wasm/resvg": emptyStub,
      twilio: emptyStub,
    },
  },
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.evaluation.jsonc" },
      main: "./src/test-entry.ts",
      /**
       * The suite runs inside workerd, which does not inherit the host shell's
       * environment: `process.env.EVAL_RUNS` reads as undefined there however
       * the command was invoked, so the sample count silently stayed at 1 and
       * every result this suite has ever produced was a single sample. A
       * build-time `define` was tried first and does not reach the worker
       * bundle either. A binding is the supported way in, and the config file
       * is the last hop that still has the host environment in scope.
       */
      miniflare: {
        bindings: {
          EVAL_RUNS: process.env.EVAL_RUNS ?? "1",
          /**
           * `provider:model`, swapping the synthesis tier for one run.
           *
           * Empty rather than absent so the binding always exists — a missing
           * one throws inside workerd on read, and the failure would look like
           * a broken suite rather than an unset option.
           */
          EVAL_MODEL: process.env.EVAL_MODEL ?? "",
        },
      },
    }),
  ],
  test: {
    include: ["**/evaluation.integration.ts"],
    // The report is the product of this suite, and the pool swallows worker
    // console output by default — which would leave a run that measured
    // everything and said nothing.
    disableConsoleIntercept: true,
    setupFiles: ["./test/setup.ts"],
    // One case can take four model calls with a full catalog in the prompt.
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
});
