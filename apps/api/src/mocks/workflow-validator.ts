/**
 * Mock Workflow Validator
 *
 * Simplified workflow validator for testing.
 * Passes validation without checks.
 */

import type { Workflow } from "@dafthunk/types";

import type { ValidationError, WorkflowValidator } from "../runtime/ports";

/**
 * Mock implementation of WorkflowValidator.
 * For testing, all workflows pass validation.
 */
export class MockWorkflowValidator implements WorkflowValidator {
  validate(_workflow: Workflow): ValidationError[] {
    // Always pass validation in tests
    return [];
  }
}
