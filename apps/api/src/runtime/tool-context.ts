import type { NodeContext, ObjectStore } from "@dafthunk/runtime";

import type { Bindings } from "../context";

/**
 * Creates a NodeContext for tool execution (system-level, no org resources).
 * Used by tool registries when executing node-as-tool calls.
 */
export function createToolContext(
  nodeId: string,
  inputs: Record<string, unknown>,
  env: Bindings,
  objectStore: ObjectStore
): NodeContext {
  return {
    nodeId,
    workflowId: `tool_execution_${Date.now()}`,
    organizationId: "system",
    mode: "dev",
    inputs,
    objectStore,
    getSecret: async (secretName: string) => {
      throw new Error(
        `Secret access not available in tool execution context. Secret '${secretName}' cannot be accessed.`
      );
    },
    getIntegration: async (integrationId: string) => {
      throw new Error(
        `Integration access not available in tool execution context. Integration '${integrationId}' cannot be accessed.`
      );
    },
    env,
  };
}
