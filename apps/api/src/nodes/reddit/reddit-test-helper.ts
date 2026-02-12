import { env } from "cloudflare:test";

import type { Bindings } from "../../context";
import type { NodeContext } from "@dafthunk/runtime";

/**
 * Test configuration for Reddit integration tests.
 * Uses r/dafthunk_test as the test subreddit and u/bchapuis as the test user.
 */
export const REDDIT_TEST_CONFIG = {
  subreddit: "dafthunk_test",
  username: "bchapuis",
} as const;

/**
 * Creates a mock integration provider for Reddit tests.
 * Reads the access token from REDDIT_TEST_ACCESS_TOKEN environment variable.
 */
export function createRedditTestIntegration() {
  const token = (env as unknown as Record<string, string>)
    .REDDIT_TEST_ACCESS_TOKEN;

  if (!token) {
    return null;
  }

  return {
    id: "test-reddit-integration",
    name: "Test Reddit Integration",
    provider: "reddit",
    token,
    refreshToken: undefined,
    tokenExpiresAt: undefined,
    metadata: {},
  };
}

/**
 * Creates a NodeContext for Reddit integration tests.
 * Returns null if REDDIT_TEST_ACCESS_TOKEN is not set.
 */
export function createRedditTestContext(
  nodeId: string,
  inputs: Record<string, unknown>
): NodeContext | null {
  const integration = createRedditTestIntegration();

  if (!integration) {
    return null;
  }

  return {
    nodeId,
    workflowId: "test-workflow",
    organizationId: "test-org",
    mode: "dev",
    inputs: {
      integrationId: integration.id,
      ...inputs,
    },
    env: env as unknown as Bindings,
    getIntegration: async (integrationId: string) => {
      if (integrationId === integration.id) {
        return integration;
      }
      throw new Error(`Integration '${integrationId}' not found`);
    },
  } as unknown as NodeContext;
}

/**
 * Helper to skip tests when Reddit credentials are not available.
 */
export function skipIfNoRedditToken(): boolean {
  const token = (env as unknown as Record<string, string>)
    .REDDIT_TEST_ACCESS_TOKEN;
  return !token;
}
