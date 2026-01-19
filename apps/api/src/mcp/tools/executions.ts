import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createDatabase, getOrganizationBillingInfo } from "../../db";
import { WorkflowExecutor } from "../../services/workflow-executor";
import { DeploymentStore } from "../../stores/deployment-store";
import { ExecutionStore } from "../../stores/execution-store";
import { WorkflowStore } from "../../stores/workflow-store";
import type { McpContext } from "../index";

/**
 * Register execution tools
 */
export function registerExecutionTools(
  server: McpServer,
  context: McpContext
): void {
  // execute_workflow - Run a workflow
  server.registerTool(
    "execute_workflow",
    {
      description:
        "Execute a workflow in development mode (latest saved version). Returns an execution ID to track progress.",
      inputSchema: {
        workflowId: z.string().describe("The workflow ID to execute"),
        parameters: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("Input parameters for the workflow"),
      },
    },
    async ({ workflowId, parameters }) => {
      const workflowStore = new WorkflowStore(context.env);
      const db = createDatabase(context.env.DB);

      // Get workflow with data
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

      // Get billing info for the organization
      const billingInfo = await getOrganizationBillingInfo(
        db,
        context.organizationId
      );
      if (!billingInfo) {
        return {
          content: [
            {
              type: "text",
              text: "Error: Organization billing info not found.",
            },
          ],
          isError: true,
        };
      }

      try {
        // Execute the workflow
        const { execution } = await WorkflowExecutor.execute({
          workflow: {
            id: workflow.id,
            name: workflow.name,
            handle: workflow.handle,
            trigger: workflow.trigger,
            runtime: workflow.runtime,
            nodes: workflow.data.nodes || [],
            edges: workflow.data.edges || [],
          },
          userId: "mcp-agent",
          organizationId: context.organizationId,
          computeCredits: billingInfo.computeCredits,
          subscriptionStatus: billingInfo.subscriptionStatus ?? undefined,
          overageLimit: billingInfo.overageLimit ?? null,
          deploymentId: undefined,
          parameters: parameters || {},
          userPlan: "pro", // MCP access implies pro plan
          env: context.env,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  executionId: execution.id,
                  workflowId: execution.workflowId,
                  status: execution.status,
                  message:
                    "Workflow execution started. Use get_execution_status to check progress.",
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Failed to execute workflow - ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // execute_workflow_prod - Run a workflow in production mode
  server.registerTool(
    "execute_workflow_prod",
    {
      description:
        "Execute a workflow in production mode (uses active deployment). Requires a deployment to be set.",
      inputSchema: {
        workflowId: z.string().describe("The workflow ID to execute"),
        parameters: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("Input parameters for the workflow"),
      },
    },
    async ({ workflowId, parameters }) => {
      const workflowStore = new WorkflowStore(context.env);
      const deploymentStore = new DeploymentStore(context.env);
      const db = createDatabase(context.env.DB);

      // Get workflow metadata
      const workflow = await workflowStore.get(
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

      // Check for active deployment
      if (!workflow.activeDeploymentId) {
        return {
          content: [
            {
              type: "text",
              text: "Error: No active deployment set. Use execute_workflow for development mode or deploy the workflow first.",
            },
          ],
          isError: true,
        };
      }

      // Load workflow data from deployment snapshot
      let workflowData;
      try {
        workflowData = await deploymentStore.readWorkflowSnapshot(
          workflow.activeDeploymentId
        );
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Failed to load deployment - ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }

      // Get billing info
      const billingInfo = await getOrganizationBillingInfo(
        db,
        context.organizationId
      );
      if (!billingInfo) {
        return {
          content: [
            {
              type: "text",
              text: "Error: Organization billing info not found.",
            },
          ],
          isError: true,
        };
      }

      try {
        // Execute the workflow
        const { execution } = await WorkflowExecutor.execute({
          workflow: {
            id: workflow.id,
            name: workflow.name,
            handle: workflow.handle,
            trigger: workflowData.trigger,
            runtime: workflowData.runtime,
            nodes: workflowData.nodes || [],
            edges: workflowData.edges || [],
          },
          userId: "mcp-agent",
          organizationId: context.organizationId,
          computeCredits: billingInfo.computeCredits,
          subscriptionStatus: billingInfo.subscriptionStatus ?? undefined,
          overageLimit: billingInfo.overageLimit ?? null,
          deploymentId: workflow.activeDeploymentId,
          parameters: parameters || {},
          userPlan: "pro",
          env: context.env,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  executionId: execution.id,
                  workflowId: execution.workflowId,
                  deploymentId: workflow.activeDeploymentId,
                  status: execution.status,
                  message:
                    "Production workflow execution started. Use get_execution_status to check progress.",
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Failed to execute workflow - ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // get_execution_status - Check execution status and results
  server.registerTool(
    "get_execution_status",
    {
      description:
        "Get the current status and results of a workflow execution.",
      inputSchema: {
        executionId: z.string().describe("The execution ID"),
      },
    },
    async ({ executionId }) => {
      const executionStore = new ExecutionStore(context.env);

      const execution = await executionStore.getWithData(
        executionId,
        context.organizationId
      );
      if (!execution) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Execution '${executionId}' not found.`,
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
                executionId: execution.id,
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

  // list_executions - List recent executions for a workflow
  server.registerTool(
    "list_executions",
    {
      description: "List recent executions for a workflow.",
      inputSchema: {
        workflowId: z.string().optional().describe("Filter by workflow ID"),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe("Maximum results (default: 10)"),
      },
    },
    async ({ workflowId, limit }) => {
      const executionStore = new ExecutionStore(context.env);

      try {
        const executions = await executionStore.list(context.organizationId, {
          workflowId,
          limit,
        });

        const summaries = executions.map((execution) => ({
          id: execution.id,
          workflowId: execution.workflowId,
          status: execution.status,
          error: execution.error,
          startedAt: execution.startedAt,
          endedAt: execution.endedAt,
          usage: execution.usage,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(summaries, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Failed to list executions - ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
