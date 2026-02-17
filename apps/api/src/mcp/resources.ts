import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import { ExecutionStore } from "../stores/execution-store";
import { WorkflowStore } from "../stores/workflow-store";
import type { McpContext } from "./index";

/**
 * Register MCP resources (read-only data sources)
 */
export function registerResources(
  server: McpServer,
  context: McpContext
): void {
  // dafthunk://categories - Node categories overview
  server.registerResource(
    "categories",
    "dafthunk://categories",
    {
      description: "Node categories with counts and examples",
      mimeType: "application/json",
    },
    async () => {
      const registry = new CloudflareNodeRegistry(context.env, false);
      const nodeTypes = registry.getNodeTypes();

      // Group by category (first tag)
      const categories: Record<string, { count: number; examples: string[] }> =
        {};
      for (const nodeType of nodeTypes) {
        const category = nodeType.tags[0] || "Other";
        if (!categories[category]) {
          categories[category] = { count: 0, examples: [] };
        }
        categories[category].count++;
        if (categories[category].examples.length < 3) {
          categories[category].examples.push(nodeType.name);
        }
      }

      return {
        contents: [
          {
            uri: "dafthunk://categories",
            mimeType: "application/json",
            text: JSON.stringify(categories, null, 2),
          },
        ],
      };
    }
  );

  // dafthunk://workflows - List of workflows
  server.registerResource(
    "workflows",
    "dafthunk://workflows",
    {
      description: "List of all workflows in the organization",
      mimeType: "application/json",
    },
    async () => {
      const workflowStore = new WorkflowStore(context.env);
      const workflows = await workflowStore.list(context.organizationId);

      const summaries = workflows.map((workflow) => ({
        id: workflow.id,
        name: workflow.name,
        handle: workflow.handle,
        description: workflow.description,
        trigger: workflow.trigger,
        runtime: workflow.runtime,
      }));

      return {
        contents: [
          {
            uri: "dafthunk://workflows",
            mimeType: "application/json",
            text: JSON.stringify(summaries, null, 2),
          },
        ],
      };
    }
  );

  // dafthunk://workflows/{id} - Specific workflow details
  server.registerResource(
    "workflow",
    "dafthunk://workflows/{id}",
    {
      description: "Details for a specific workflow",
      mimeType: "application/json",
    },
    async (uri) => {
      const workflowId = uri.pathname.split("/").pop();
      if (!workflowId) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: "Error: Invalid workflow URI",
            },
          ],
        };
      }

      const workflowStore = new WorkflowStore(context.env);
      const workflow = await workflowStore.getWithData(
        workflowId,
        context.organizationId
      );

      if (!workflow) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: `Error: Workflow '${workflowId}' not found`,
            },
          ],
        };
      }

      const response = {
        id: workflow.id,
        name: workflow.name,
        handle: workflow.handle,
        description: workflow.description,
        trigger: workflow.trigger,
        runtime: workflow.runtime,
        nodes: workflow.data.nodes || [],
        edges: workflow.data.edges || [],
      };

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    }
  );

  // dafthunk://executions/{id} - Specific execution details
  server.registerResource(
    "execution",
    "dafthunk://executions/{id}",
    {
      description: "Details for a specific execution",
      mimeType: "application/json",
    },
    async (uri) => {
      const executionId = uri.pathname.split("/").pop();
      if (!executionId) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: "Error: Invalid execution URI",
            },
          ],
        };
      }

      const executionStore = new ExecutionStore(context.env);
      const execution = await executionStore.getWithData(
        executionId,
        context.organizationId
      );

      if (!execution) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/plain",
              text: `Error: Execution '${executionId}' not found`,
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                id: execution.id,
                workflowId: execution.workflowId,
                status: execution.status,
                error: execution.error,
                startedAt: execution.startedAt,
                endedAt: execution.endedAt,
                usage: execution.usage,
                nodeExecutions: execution.data.nodeExecutions,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
