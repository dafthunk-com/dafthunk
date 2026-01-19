import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { Bindings } from "../context";
import { registerPrompts } from "./prompts";
import { registerResources } from "./resources";
import { registerBuildingTools } from "./tools/building";
import { registerExecutionTools } from "./tools/executions";
import { registerNodeTools } from "./tools/nodes";
import { registerWorkflowTools } from "./tools/workflows";

/**
 * MCP server context passed to all tool handlers
 */
export interface McpContext {
  env: Bindings;
  organizationId: string;
}

/**
 * Creates and configures an MCP server instance with all tools, resources, and prompts
 */
export function createMcpServer(context: McpContext): McpServer {
  const server = new McpServer({
    name: "dafthunk",
    version: "1.0.0",
  });

  // Register all tools
  registerNodeTools(server, context);
  registerWorkflowTools(server, context);
  registerBuildingTools(server, context);
  registerExecutionTools(server, context);

  // Register resources
  registerResources(server, context);

  // Register prompts
  registerPrompts(server);

  return server;
}
