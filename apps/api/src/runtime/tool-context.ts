import type {
  CredentialService,
  NodeContext,
  ObjectStore,
} from "@dafthunk/runtime";

import type { Bindings } from "../context";

/**
 * Creates a NodeContext for tool execution.
 * Reads organizationId from the credential service (must be initialized).
 */
export function createToolContext(
  nodeId: string,
  inputs: Record<string, unknown>,
  env: Bindings,
  objectStore: ObjectStore,
  credentialService: CredentialService
): NodeContext {
  return {
    nodeId,
    workflowId: `tool_execution_${Date.now()}`,
    organizationId: credentialService.getOrganizationId(),
    mode: "dev",
    inputs,
    objectStore,
    getSecret: (secretName: string) => credentialService.getSecret(secretName),
    getIntegration: (integrationId: string) =>
      credentialService.getIntegration(integrationId),
    env,
  };
}
