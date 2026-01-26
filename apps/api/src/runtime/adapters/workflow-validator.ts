/**
 * Cloudflare Workflow Validator
 *
 * Implementation of WorkflowValidator port for the Cloudflare platform.
 * Wraps the existing validateWorkflow function.
 */

import type { ValidationError, WorkflowValidator } from "@dafthunk/runtime";
import type { Workflow } from "@dafthunk/types";
import { validateWorkflow } from "../../utils/workflows";

/**
 * Cloudflare implementation of WorkflowValidator.
 * Wraps the existing validateWorkflow function.
 */
export class CloudflareWorkflowValidator implements WorkflowValidator {
  validate(workflow: Workflow): ValidationError[] {
    const errors = validateWorkflow(workflow);
    // Map to the port interface (already compatible)
    return errors.map((e) => ({
      type: e.type,
      message: e.message,
      details: e.details as Record<string, unknown>,
    }));
  }
}
