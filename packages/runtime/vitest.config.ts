import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/geo/**/*.test.ts"],
    testTimeout: 10000,
  },
});
