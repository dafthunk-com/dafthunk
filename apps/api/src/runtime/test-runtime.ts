import { env } from "cloudflare:test";

import type { Bindings } from "../context";
import { TestNodeRegistry } from "../nodes/test-node-registry";

/**
 * Initialize the test environment with a minimal NodeRegistry
 * that only includes basic math operations to avoid Node.js dependency issues.
 *
 * Uses proper Miniflare bindings for D1, R2, AI, etc. from vitest-pool-workers.
 * The bindings (DB, RESSOURCES, DATASETS, AI, etc.) are automatically available
 * through the cloudflare:test module from the wrangler.test.jsonc configuration.
 *
 * Call this in test setup files or at the beginning of tests
 * that need to use workflow nodes.
 */
export function initializeTestEnvironment(
  envOverrides: Record<string, any> = {}
) {
  // Use real Miniflare bindings from vitest-pool-workers
  // The env object includes all bindings from wrangler.test.jsonc:
  // - DB (D1 database)
  // - AI (Workers AI)
  // - RESSOURCES (R2 bucket)
  // - DATASETS (R2 bucket)
  // - KV (KV namespace)
  // - COMPUTE (Analytics Engine)
  // - Rate limiting bindings
  // Plus environment variables from .dev.vars
  const testEnv = {
    ...env, // Real Cloudflare bindings from Miniflare
    ...envOverrides, // Allow overrides for specific tests
  } as Bindings;

  return new TestNodeRegistry(testEnv, true);
}

/**
 * Get the test node registry instance.
 * Must call initializeTestEnvironment() first.
 */
export function getTestNodeRegistry() {
  // For backward compatibility, we'll create a new instance each time
  // In a real implementation, you might want to store this in a module-level variable
  return new TestNodeRegistry(env as Bindings, true);
}
