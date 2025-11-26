import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    root: path.dirname(new URL(import.meta.url).pathname),
    include: ["scripts/__tests__/**/*.ts"],
    testTimeout: 30000, // Scripts can be slow
    hookTimeout: 10000,
  },
});
