/**
 * Mock Resource Provider
 *
 * Test implementation of ResourceProvider that doesn't access database tables.
 * Provides empty secrets and integrations for testing workflows that don't need them.
 */

import type { Bindings } from "../context";
import type { CloudflareToolRegistry } from "../nodes/cloudflare-tool-registry";
import type { EmailMessage, HttpRequest, NodeContext } from "../nodes/types";

/**
 * Minimal mock that avoids database access
 */
export class MockResourceProvider {
  constructor(
    private env: Bindings,
    private toolRegistry: CloudflareToolRegistry
  ) {}

  /**
   * Mock initialization - no database access
   */
  async initialize(_organizationId: string): Promise<void> {
    // No-op - tests don't need secrets or integrations
  }

  /**
   * Creates a NodeContext for node execution
   */
  createNodeContext(
    nodeId: string,
    workflowId: string,
    organizationId: string,
    inputs: Record<string, unknown>,
    httpRequest?: HttpRequest,
    emailMessage?: EmailMessage
  ): NodeContext {
    return {
      nodeId,
      workflowId,
      organizationId,
      mode: "dev",
      inputs,
      httpRequest,
      emailMessage,
      onProgress: () => {},
      toolRegistry: this.toolRegistry,
      getSecret: async (_secretName: string) => {
        return undefined;
      },
      getIntegration: async (integrationId: string) => {
        throw new Error(
          `Integration '${integrationId}' not available in test environment`
        );
      },
      env: this.env,
    };
  }

  /**
   * Creates a NodeContext for tool execution
   */
  createToolContext(
    nodeId: string,
    inputs: Record<string, unknown>
  ): NodeContext {
    return {
      nodeId,
      workflowId: `tool_execution_${Date.now()}`,
      organizationId: "system",
      mode: "dev",
      inputs,
      toolRegistry: this.toolRegistry,
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
      env: this.env,
    };
  }
}
