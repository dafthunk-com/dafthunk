import type { Workflow } from "@dafthunk/types";

import type { Bindings } from "../../context";
import { TRIAL_CREDITS } from "../../constants/billing";
import type { BaseRuntime, RuntimeParams } from "../base-runtime";
import { CloudflareWorkerRuntime } from "../worker-runtime";

/**
 * Helper to create unique instance IDs for test workflows
 */
export const createInstanceId = (testName: string): string =>
  `test-${testName}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

/**
 * Helper to create runtime params for test workflows
 */
export const createParams = (workflow: Workflow): RuntimeParams => ({
  workflow,
  userId: "test-user",
  organizationId: "test-org",
  computeCredits: TRIAL_CREDITS,
});

/**
 * Helper to create a test runtime instance.
 * Uses CloudflareWorkerRuntime for direct, non-durable execution.
 * This allows testing without depending on the EXECUTE binding or Workflows infrastructure.
 */
export const createTestRuntime = (env: Bindings): BaseRuntime => {
  return CloudflareWorkerRuntime.create(env);
};
