import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Hono } from "hono";

import { apiKeyMiddleware, mcpEnabledMiddleware } from "../auth";
import type { ApiContext } from "../context";
import { createMcpServer, type McpContext } from "../mcp";

/**
 * MCP (Model Context Protocol) routes
 *
 * Provides an MCP server at /:organizationHandle/mcp that enables AI agents
 * to create and manage workflows programmatically.
 *
 * Transport: Streamable HTTP (Web Standard)
 * - Supports both SSE streaming and direct JSON responses
 * - Stateless mode (no session management) for Cloudflare Workers compatibility
 *
 * Authentication: API key required (Bearer dk_xxx)
 */
const mcpRoutes = new Hono<ApiContext>();

/**
 * Handle all MCP requests (GET, POST, DELETE)
 *
 * The WebStandardStreamableHTTPServerTransport handles:
 * - GET: SSE stream for receiving server messages
 * - POST: Send JSON-RPC messages to the server
 * - DELETE: Terminate sessions (no-op in stateless mode)
 */
mcpRoutes.all("/", apiKeyMiddleware, mcpEnabledMiddleware, async (c) => {
  const organizationId = c.get("organizationId")!;

  // Create MCP context for this request
  const mcpContext: McpContext = {
    env: c.env,
    organizationId,
  };

  // Create MCP server with all tools, resources, and prompts
  const mcpServer = createMcpServer(mcpContext);

  // Create stateless transport (no session management for Cloudflare Workers)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless mode
    enableJsonResponse: true, // Return JSON instead of SSE for simple requests
  });

  // Connect the MCP server to the transport
  await mcpServer.connect(transport);

  // Handle the request and return the response
  const response = await transport.handleRequest(c.req.raw);

  // Clean up after handling
  // Note: In stateless mode, each request creates a new server+transport pair
  // This is intentional for Cloudflare Workers where state is not preserved

  return response;
});

export default mcpRoutes;
