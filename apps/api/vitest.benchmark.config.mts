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
    }),
  ],
  test: {
    include: ["**/benchmark.integration.ts"],
    setupFiles: ["./test/setup.ts"],
    // One case can take four model calls with a full catalog in the prompt.
    testTimeout: 300_000,
    hookTimeout: 300_000,
  },
});
