/**
 * Mock Credential Service
 *
 * Test implementation of CredentialService that doesn't access database tables.
 * Provides empty secrets and integrations for testing workflows that don't need them.
 */

import type {
  CredentialService,
  DatabaseService,
  NodeContext,
  WorkflowExecutionContext,
} from "@dafthunk/runtime";
import type { Bindings } from "../context";
import type { CloudflareToolRegistry } from "../nodes/cloudflare-tool-registry";

/**
 * Minimal mock that avoids database access
 */
export class MockCredentialService implements CredentialService {
  constructor(
    private env: Bindings,
    private toolRegistry: CloudflareToolRegistry,
    private databaseService?: DatabaseService
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
    context: WorkflowExecutionContext,
    inputs: Record<string, unknown>
  ): NodeContext {
    const {
      workflowId,
      organizationId,
      deploymentId,
      httpRequest,
      emailMessage,
      queueMessage,
      scheduledTrigger,
    } = context;

    return {
      nodeId,
      workflowId,
      organizationId,
      mode: deploymentId ? "prod" : "dev",
      deploymentId,
      inputs,
      httpRequest,
      emailMessage,
      queueMessage,
      scheduledTrigger,
      onProgress: () => {},
      toolRegistry: this.toolRegistry,
      databaseService: this.databaseService,
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
