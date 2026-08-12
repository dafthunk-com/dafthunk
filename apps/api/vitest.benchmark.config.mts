import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const emptyStub = resolve(__dirname, "test/stubs/empty-module.ts");

/**
 * Config for the generator benchmark.
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
      wrangler: { configPath: "./wrangler.test.jsonc" },
      main: "./src/test-entry.ts",
      /**
       * `provider:model`, swapping the synthesis tier for one run, so comparing
       * two models is two commands rather than two source edits. Empty rather
       * than absent so the binding always exists — a missing one throws inside
       * workerd on read, which would look like a broken suite rather than an
       * unset option.
       */
      miniflare: {
        bindings: { EVAL_MODEL: process.env.EVAL_MODEL ?? "" },
      },
    }),
  ],
  test: {
    include: ["**/benchmark.integration.ts"],
    // The pass rate is the product of this suite, and the pool swallows worker
    // console output by default — which would leave a run that measured
    // everything and said nothing.
    disableConsoleIntercept: true,
    setupFiles: ["./test/setup.ts"],
    // One case can take four model calls with a full catalog in the prompt.
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
});
