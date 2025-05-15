import { Node, Workflow as WorkflowType } from "@dafthunk/types";
import { createDatabase, ExecutionStatus } from "../db";
import { getWorkflowById, getDeploymentById, saveExecution } from "./db";
import { Context } from "hono";
import { ApiContext } from "../context";

export interface ExecutionParams {
  c: Context<ApiContext>;
  workflowId: string;
  deploymentId?: string;
  userId: string;
  organizationId: string;
  monitorProgress?: boolean;
}

export async function executeWorkflow(params: ExecutionParams) {
  const { c, workflowId, deploymentId, userId, organizationId, monitorProgress } = params;
  const db = createDatabase(c.env.DB);

  // Get workflow data either from deployment or directly from workflow
  let workflowData: WorkflowType;
  let workflow: any;

  if (deploymentId) {
    // Get workflow data from deployment
    const deployment = await getDeploymentById(db, deploymentId, organizationId);
    if (!deployment) {
      return { error: "Deployment not found", status: 404 };
    }
    workflowData = deployment.workflowData as WorkflowType;
    workflow = {
      id: deployment.workflowId,
      name: workflowData.name,
    };
  } else {
    // Get workflow data directly
    workflow = await getWorkflowById(db, workflowId, organizationId);
    if (!workflow) {
      return { error: "Workflow not found", status: 404 };
    }
    workflowData = workflow.data as WorkflowType;
  }

  // Validate if workflow has nodes
  if (!workflowData.nodes || workflowData.nodes.length === 0) {
    return {
      error: "Cannot execute an empty workflow. Please add nodes to the workflow.",
      status: 400,
    };
  }

  // Extract HTTP request information
  const headers = c.req.header();
  const url = c.req.url;
  const method = c.req.method;
  const query = Object.fromEntries(new URL(c.req.url).searchParams.entries());

  // Try to parse form data
  let formData: Record<string, string | File> | undefined;
  try {
    formData = Object.fromEntries(await c.req.formData());
  } catch {
    // No form data or invalid form data
  }

  // Get request body if it exists
  let body: any = undefined;
  try {
    if (c.req.raw.headers.get("content-type")?.includes("application/json")) {
      body = await c.req.json();
    }
  } catch {
    // No body or invalid JSON
  }

  // Trigger the runtime and get the instance id
  const instance = await c.env.EXECUTE.create({
    params: {
      userId,
      organizationId,
      workflow: {
        id: workflow.id,
        name: workflow.name,
        handle: workflow.handle,
        nodes: workflowData.nodes,
        edges: workflowData.edges,
      },
      monitorProgress,
      deploymentId,
      httpRequest: {
        url,
        method,
        headers,
        query,
        formData,
        body,
      },
    },
  });
  const executionId = instance.id;

  // Build initial nodeExecutions (all idle)
  const nodeExecutions = workflowData.nodes.map((node: Node) => ({
    nodeId: node.id,
    status: "idle" as const,
  }));

  // Map our API type status to DB-compatible status
  const executingStatus = ExecutionStatus.EXECUTING;

  // Save initial execution record
  const initialExecution = await saveExecution(db, {
    id: executionId,
    workflowId: workflow.id,
    deploymentId,
    userId,
    organizationId,
    status: executingStatus,
    visibility: "private",
    nodeExecutions,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    execution: initialExecution,
    status: 201,
  };
} 