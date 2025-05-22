import {
  ExecuteDeploymentResponse,
  GetDeploymentVersionResponse,
  GetWorkflowDeploymentsResponse,
  ListDeploymentsResponse,
  Node,
  Workflow as WorkflowType,
  WorkflowDeployment,
  WorkflowDeploymentVersion,
} from "@dafthunk/types";
import { Hono } from "hono";
import { Context } from "hono";
import { v7 as uuid } from "uuid";

import { jwtMiddleware } from "../auth";
import { ApiContext, CustomJWTPayload } from "../context";
import { createDatabase, ExecutionStatus } from "../db";
import {
  createDeployment,
  getDeploymentById,
  getDeploymentsByWorkflowId,
  getDeploymentsGroupedByWorkflow,
  getLatestDeploymentByWorkflowIdOrHandle,
  getLatestVersionNumberByWorkflowId,
  getWorkflowByIdOrHandle,
  saveExecution,
  verifyApiKey,
} from "../db";

// Extend the ApiContext with our custom variable
type ExtendedApiContext = ApiContext & {
  Variables: {
    jwtPayload?: CustomJWTPayload;
    organizationId?: string;
  };
};

const deploymentRoutes = new Hono<ExtendedApiContext>();

// API key authentication middleware
const apiKeyAuth = async (
  c: Context<ExtendedApiContext>,
  next: () => Promise<void>
) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "API key is required" }, 401);
  }

  const apiKey = authHeader.substring(7); // Remove "Bearer " prefix
  const db = createDatabase(c.env.DB);

  const organizationId = await verifyApiKey(db, apiKey);

  if (!organizationId) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  // Store the organization ID in the context for later use
  c.set("organizationId", organizationId);

  await next();
};

// Middleware that allows either JWT or API key authentication
const authMiddleware = async (
  c: Context<ExtendedApiContext>,
  next: () => Promise<void>
) => {
  const authHeader = c.req.header("Authorization");

  // If Authorization header is present, try API key auth
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return apiKeyAuth(c, next);
  }

  // Otherwise, use JWT auth
  return jwtMiddleware(c, next);
};

/**
 * GET /deployments
 * Returns deployments grouped by workflow with counts and latest ID
 */
deploymentRoutes.get("/", jwtMiddleware, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const db = createDatabase(c.env.DB);

  const groupedDeployments = await getDeploymentsGroupedByWorkflow(
    db,
    user.organization.id
  );

  // Transform to match WorkflowDeployment type
  const typedDeployments: WorkflowDeployment[] = groupedDeployments;

  const response: ListDeploymentsResponse = { workflows: typedDeployments };
  return c.json(response);
});

/**
 * GET /deployments/version/:deploymentUUID
 * Returns a specific deployment by UUID
 */
deploymentRoutes.get("/version/:deploymentUUID", jwtMiddleware, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const deploymentUUID = c.req.param("deploymentUUID");
  const db = createDatabase(c.env.DB);

  const deployment = await getDeploymentById(
    db,
    deploymentUUID,
    user.organization.id
  );

  if (!deployment) {
    return c.json({ error: "Deployment not found" }, 404);
  }

  const workflowData = deployment.workflowData as WorkflowType;

  // Transform to match WorkflowDeploymentVersion type
  const deploymentVersion: GetDeploymentVersionResponse = {
    id: deployment.id,
    workflowId: deployment.workflowId || "",
    version: deployment.version,
    createdAt: deployment.createdAt,
    updatedAt: deployment.updatedAt,
    nodes: workflowData.nodes || [],
    edges: workflowData.edges || [],
  };

  return c.json(deploymentVersion);
});

/**
 * GET /deployments/:workflowUUID
 * Returns the latest deployment for a workflow
 */
deploymentRoutes.get("/:workflowUUID", jwtMiddleware, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const workflowUUID = c.req.param("workflowUUID");
  const db = createDatabase(c.env.DB);

  // Check if workflow exists and belongs to the organization
  const workflow = await getWorkflowByIdOrHandle(
    db,
    workflowUUID,
    user.organization.id
  );
  if (!workflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  // Get the latest deployment
  const deployment = await getLatestDeploymentByWorkflowIdOrHandle(
    db,
    workflowUUID,
    user.organization.id
  );

  if (!deployment) {
    return c.json({ error: "No deployments found for this workflow" }, 404);
  }

  const workflowData = deployment.workflowData as WorkflowType;

  // Transform to match WorkflowDeploymentVersion type
  const deploymentVersion: GetDeploymentVersionResponse = {
    id: deployment.id,
    workflowId: deployment.workflowId || "",
    version: deployment.version,
    createdAt: deployment.createdAt,
    updatedAt: deployment.updatedAt,
    nodes: workflowData.nodes || [],
    edges: workflowData.edges || [],
  };

  return c.json(deploymentVersion);
});

/**
 * POST /deployments/:workflowUUID
 * Creates a new deployment for a workflow
 */
deploymentRoutes.post("/:workflowUUID", jwtMiddleware, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const workflowUUID = c.req.param("workflowUUID");
  const db = createDatabase(c.env.DB);
  const now = new Date();

  // Check if workflow exists and belongs to the organization
  const workflow = await getWorkflowByIdOrHandle(
    db,
    workflowUUID,
    user.organization.id
  );
  if (!workflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  const workflowData = workflow.data as WorkflowType;

  // Get the latest version number and increment
  const latestVersion =
    (await getLatestVersionNumberByWorkflowId(
      db,
      workflowUUID,
      user.organization.id
    )) || 0;
  const newVersion = latestVersion + 1;

  // Create new deployment
  const deploymentId = uuid();
  const newDeployment = await createDeployment(db, {
    id: deploymentId,
    organizationId: user.organization.id,
    workflowId: workflowUUID,
    version: newVersion,
    workflowData: workflowData,
    createdAt: now,
    updatedAt: now,
  });

  // Transform to match WorkflowDeploymentVersion type
  const deploymentVersion: WorkflowDeploymentVersion = {
    id: newDeployment.id,
    workflowId: newDeployment.workflowId || "",
    version: newDeployment.version,
    createdAt: newDeployment.createdAt,
    updatedAt: newDeployment.updatedAt,
    nodes: workflowData.nodes || [],
    edges: workflowData.edges || [],
  };

  return c.json(deploymentVersion, 201);
});

/**
 * GET /deployments/history/:workflowUUID
 * Returns all deployments for a workflow
 */
deploymentRoutes.get("/history/:workflowUUID", jwtMiddleware, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const workflowUUID = c.req.param("workflowUUID");
  const db = createDatabase(c.env.DB);

  // Check if workflow exists and belongs to the organization
  const workflow = await getWorkflowByIdOrHandle(
    db,
    workflowUUID,
    user.organization.id
  );
  if (!workflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  // Get all deployments for this workflow
  const deploymentsList = await getDeploymentsByWorkflowId(
    db,
    workflowUUID,
    user.organization.id
  );

  // Transform to match WorkflowDeploymentVersion type
  const deploymentVersions = deploymentsList.map((deployment) => {
    const workflowData = deployment.workflowData as WorkflowType;
    return {
      id: deployment.id,
      workflowId: deployment.workflowId || "",
      version: deployment.version,
      createdAt: deployment.createdAt,
      updatedAt: deployment.updatedAt,
      nodes: workflowData.nodes || [],
      edges: workflowData.edges || [],
    };
  });

  const response: GetWorkflowDeploymentsResponse = {
    workflow: {
      id: workflow.id,
      name: workflow.name,
    },
    deployments: deploymentVersions,
  };

  return c.json(response);
});

/**
 * POST /deployments/version/:deploymentUUID/execute
 * Executes a specific deployment version
 * Supports both JWT and API key authentication
 */
deploymentRoutes.post(
  "/version/:deploymentUUID/execute",
  authMiddleware,
  async (c) => {
    // Get organization ID and user ID from either JWT or API key auth
    let organizationId: string;
    let userId: string;

    const jwtPayload = c.get("jwtPayload");
    if (jwtPayload) {
      // Authentication was via JWT
      organizationId = jwtPayload.organization.id;
      userId = jwtPayload.sub || "anonymous";
    } else {
      // Authentication was via API key
      const orgId = c.get("organizationId");
      if (!orgId) {
        return c.json({ error: "Organization ID not found" }, 500);
      }
      organizationId = orgId;
      userId = "api"; // Use a placeholder for API-triggered executions
    }

    const deploymentUUID = c.req.param("deploymentUUID");
    const db = createDatabase(c.env.DB);

    const monitorProgress =
      new URL(c.req.url).searchParams.get("monitorProgress") === "true";

    // Get the deployment
    const deployment = await getDeploymentById(
      db,
      deploymentUUID,
      organizationId
    );

    if (!deployment) {
      return c.json({ error: "Deployment not found" }, 404);
    }

    const workflowData = deployment.workflowData as WorkflowType;

    // Validate if workflow has nodes
    if (!workflowData.nodes || workflowData.nodes.length === 0) {
      return c.json(
        {
          error:
            "Cannot execute an empty workflow. Please add nodes to the workflow.",
        },
        400
      );
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
          id: deployment.workflowId || "",
          name: workflowData.name,
          handle: workflowData.handle,
          type: workflowData.type,
          nodes: workflowData.nodes,
          edges: workflowData.edges,
        },
        monitorProgress,
        deploymentId: deployment.id,
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
      workflowId: deployment.workflowId || "",
      deploymentId: deployment.id,
      userId,
      organizationId,
      status: executingStatus,
      visibility: "private",
      nodeExecutions,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Return the initial execution object, explicitly matching ExecuteDeploymentResponse
    const response: ExecuteDeploymentResponse = {
      id: initialExecution.id,
      workflowId: initialExecution.workflowId,
      deploymentId: deployment.id,
      status: "executing",
      nodeExecutions: workflowData.nodes.map((node) => ({
        nodeId: node.id,
        status: "idle",
      })),
    };

    return c.json(response, 201);
  }
);

export default deploymentRoutes;
