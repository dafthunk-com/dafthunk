import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // These modules are only available in the Cloudflare Workers runtime.
      // Node tests don't exercise workflow retry semantics or sandbox execution,
      // so we provide minimal stubs to keep the module graph importable.
      "cloudflare:workflows": new URL(
        "src/__test-stubs__/cloudflare-workflows.ts",
        import.meta.url
      ).pathname,
      "@cloudflare/sandbox": new URL(
        "src/__test-stubs__/cloudflare-sandbox.ts",
        import.meta.url
      ).pathname,
    },
  },
});
