import type { WorkflowExecutionContext } from "./execution-types";
import type { NodeContext } from "./node-types";

/**
 * Credential service abstraction for accessing organization secrets and integrations.
 */
export interface CredentialService {
  initialize(organizationId: string): Promise<void>;
  createNodeContext(
    nodeId: string,
    context: WorkflowExecutionContext,
    inputs: Record<string, unknown>
  ): NodeContext;
  createToolContext(
    nodeId: string,
    inputs: Record<string, unknown>
  ): NodeContext;
}
