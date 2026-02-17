import type { WorkflowRuntime, WorkflowTrigger } from "@dafthunk/types";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { v7 as uuid } from "uuid";
import { z } from "zod";
import { createHandle } from "../../db";
import { WorkflowStore } from "../../stores/workflow-store";
import { validateWorkflow } from "../../utils/workflows";
import type { McpContext } from "../index";

/**
 * Register workflow management tools
 */
export function registerWorkflowTools(
  server: McpServer,
  context: McpContext
): void {
  // list_workflows - List all workflows in the organization
  server.registerTool(
    "list_workflows",
    {
      description:
        "List all workflows in the organization. Returns workflow metadata without node/edge details.",
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
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(summaries, null, 2),
          },
        ],
      };
    }
  );

  // get_workflow - Get full workflow details including nodes and edges
  server.registerTool(
    "get_workflow",
    {
      description:
        "Get complete workflow details including all nodes and edges. Use the workflow ID from list_workflows.",
      inputSchema: {
        workflowId: z.string().describe("The workflow ID"),
      },
    },
    async ({ workflowId }) => {
      const workflowStore = new WorkflowStore(context.env);
      const workflow = await workflowStore.getWithData(
        workflowId,
        context.organizationId
      );

      if (!workflow) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Workflow '${workflowId}' not found.`,
            },
          ],
          isError: true,
        };
      }

      const response = {
        id: workflow.id,
        name: workflow.name,
        handle: workflow.handle,
        description: workflow.description,
        trigger: workflow.trigger,
        runtime: workflow.runtime,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
        nodes: workflow.data.nodes || [],
        edges: workflow.data.edges || [],
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    }
  );

  // create_workflow - Create a new empty workflow
  server.registerTool(
    "create_workflow",
    {
      description:
        "Create a new workflow. Returns the workflow ID for use with add_node and connect_nodes.",
      inputSchema: {
        name: z.string().describe("Workflow name"),
        description: z.string().optional().describe("Workflow description"),
        trigger: z
          .enum([
            "manual",
            "http_webhook",
            "http_request",
            "email_message",
            "queue_message",
            "scheduled",
          ])
          .describe("Workflow trigger type"),
        runtime: z
          .enum(["worker", "workflow"])
          .optional()
          .default("workflow")
          .describe(
            "Runtime mode: 'worker' (fast, max 30s) or 'workflow' (durable, with retries)"
          ),
      },
    },
    async ({ name, description, trigger, runtime }) => {
      const workflowStore = new WorkflowStore(context.env);
      const now = new Date();

      const workflowId = uuid();
      const workflowHandle = createHandle(name);

      const workflow = await workflowStore.save({
        id: workflowId,
        name,
        description,
        handle: workflowHandle,
        trigger: trigger as WorkflowTrigger,
        runtime: (runtime || "workflow") as WorkflowRuntime,
        organizationId: context.organizationId,
        nodes: [],
        edges: [],
        createdAt: now,
        updatedAt: now,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                id: workflow.id,
                name: workflow.name,
                handle: workflow.handle,
                trigger: workflow.trigger,
                runtime: workflow.runtime,
                message: "Workflow created. Use add_node to add nodes.",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // delete_workflow - Delete a workflow
  server.registerTool(
    "delete_workflow",
    {
      description: "Delete a workflow permanently. This cannot be undone.",
      inputSchema: {
        workflowId: z.string().describe("The workflow ID to delete"),
      },
    },
    async ({ workflowId }) => {
      const workflowStore = new WorkflowStore(context.env);
      const deleted = await workflowStore.delete(
        workflowId,
        context.organizationId
      );

      if (!deleted) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Workflow '${workflowId}' not found.`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                id: workflowId,
                message: "Workflow deleted successfully.",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // validate_workflow - Check a workflow for errors
  server.registerTool(
    "validate_workflow",
    {
      description:
        "Validate a workflow for errors before execution. Checks for cycles, missing connections, and type mismatches.",
      inputSchema: {
        workflowId: z.string().describe("The workflow ID to validate"),
      },
    },
    async ({ workflowId }) => {
      const workflowStore = new WorkflowStore(context.env);
      const workflow = await workflowStore.getWithData(
        workflowId,
        context.organizationId
      );

      if (!workflow) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Workflow '${workflowId}' not found.`,
            },
          ],
          isError: true,
        };
      }

      const workflowData = {
        id: workflow.id,
        name: workflow.name,
        handle: workflow.handle,
        trigger: workflow.trigger,
        nodes: workflow.data.nodes || [],
        edges: workflow.data.edges || [],
      };

      const errors = validateWorkflow(workflowData);

      if (errors.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  valid: true,
                  message: "Workflow is valid and ready for execution.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                valid: false,
                errors,
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
