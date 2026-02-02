import type { Workflow } from "@dafthunk/types";

import { TRIAL_CREDITS } from "../../constants/billing";
import type { Bindings } from "../../context";
import type { Runtime, RuntimeParams } from "../base-runtime";
import { WorkerRuntime } from "../worker-runtime";

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
 * Runtime factory type for creating test runtime instances.
 * Allows testing different runtime implementations with the same specification.
 */
export type RuntimeFactory = (env: Bindings) => Runtime;

/**
 * Helper to create a test runtime instance.
 * Uses CloudflareWorkerRuntime for direct, non-durable execution.
 * This allows testing without depending on the EXECUTE binding or Workflows infrastructure.
 */
export const createTestRuntime = (env: Bindings): Runtime => {
  return WorkerRuntime.create(env);
};
