import type { Workflow } from "@dafthunk/types";

import type { RuntimeParams } from "../runtime";

/**
 * Interface for runtime instances that can execute workflows.
 * Platform-agnostic - implementations provide their own runtime creation.
 */
export interface TestableRuntime {
  run(params: RuntimeParams, instanceId: string): Promise<import("@dafthunk/types").WorkflowExecution>;
}

/**
 * Runtime factory type for creating test runtime instances.
 * The factory is a closure that captures any platform-specific dependencies.
 */
export type RuntimeFactory = () => TestableRuntime;

/**
 * Helper to create unique instance IDs for test workflows.
 */
export const createInstanceId = (testName: string): string =>
  `test-${testName}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

/**
 * Default compute credits for test workflows.
 */
const DEFAULT_TEST_CREDITS = 10000;

/**
 * Helper to create runtime params for test workflows.
 */
export const createParams = (
  workflow: Workflow,
  computeCredits: number = DEFAULT_TEST_CREDITS
): RuntimeParams => ({
  workflow,
  userId: "test-user",
  organizationId: "test-org",
  computeCredits,
});
