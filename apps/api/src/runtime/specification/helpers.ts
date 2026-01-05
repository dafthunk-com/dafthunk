import type { Workflow } from "@dafthunk/types";

import { TRIAL_CREDITS } from "../../constants/billing";
import type { RuntimeParams } from "../base-runtime";

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
