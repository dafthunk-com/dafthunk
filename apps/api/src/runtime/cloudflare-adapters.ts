/**
 * Cloudflare Adapters
 *
 * Implementations of runtime port interfaces for the Cloudflare platform.
 * These adapters wrap existing functionality to conform to the runtime interfaces.
 */

import type { ParameterValue as ApiParameterValue, Workflow } from "@dafthunk/types";

import {
  apiToNodeParameter,
  nodeToApiParameter,
} from "../nodes/parameter-mapper";
import { validateWorkflow } from "../utils/workflows";
import type {
  ObjectStore,
  ParameterMapper,
  ValidationError,
  WorkflowValidator,
} from "@dafthunk/runtime";

/**
 * Cloudflare implementation of ParameterMapper.
 * Wraps the existing parameter-mapper functions with ObjectStore dependency injection.
 */
export class CloudflareParameterMapper implements ParameterMapper {
  constructor(private readonly objectStore: ObjectStore) {}

  async nodeToApi(
    type: string,
    value: unknown,
    organizationId: string,
    executionId?: string
  ): Promise<ApiParameterValue> {
    return nodeToApiParameter(
      type as any,
      value,
      this.objectStore,
      organizationId,
      executionId
    );
  }

  async apiToNode(type: string, value: ApiParameterValue): Promise<unknown> {
    return apiToNodeParameter(type as any, value, this.objectStore);
  }
}

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
