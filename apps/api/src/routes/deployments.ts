import {
  Deployment,
  DeploymentVersion,
  ExecuteDeploymentResponse,
  GetDeploymentVersionResponse,
  GetWorkflowDeploymentsResponse,
  ListDeploymentsResponse,
  Node,
} from "@dafthunk/types";
import { JWTTokenPayload } from "@dafthunk/types";
import { Hono } from "hono";
import { v7 as uuid } from "uuid";

import { apiKeyOrJwtMiddleware, jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import { createDatabase, ExecutionStatus } from "../db";
import {
  createDeployment,
  getDeployment,
  getDeployments,
  getDeploymentsGroupedByWorkflow,
  getLatestDeployment,
  getLatestDeploymentsVersionNumbers,
  getOrganizationComputeCredits,
  getWorkflow,
  saveExecution,
} from "../db";
import { createRateLimitMiddleware } from "../middleware/rate-limit";
import { ObjectStore } from "../runtime/object-store";

// Extend the ApiContext with our custom variable
type ExtendedApiContext = ApiContext & {
  Variables: {
    jwtPayload?: JWTTokenPayload;
    organizationId?: string;
  };
};

const deploymentRoutes = new Hono<ExtendedApiContext>();

/**
 * GET /deployments
 * Returns deployments grouped by workflow with counts and latest ID
 */
deploymentRoutes.get("/", jwtMiddleware, async (c) => {
  const organizationId = c.get("organizationId")!;
  const db = createDatabase(c.env.DB);

  const groupedDeployments = await getDeploymentsGroupedByWorkflow(
    db,
    organizationId
  );

  // Transform to match WorkflowDeployment type
  const typedDeployments: Deployment[] = groupedDeployments;

  const response: ListDeploymentsResponse = { workflows: typedDeployments };
  return c.json(response);
});

/**
 * GET /deployments/version/:deploymentId
 * Returns a specific deployment by UUID
 */
deploymentRoutes.get("/version/:deploymentId", jwtMiddleware, async (c) => {
  const organizationId = c.get("organizationId")!;
  const deploymentId = c.req.param("deploymentId");
  const db = createDatabase(c.env.DB);

  const deployment = await getDeployment(db, deploymentId, organizationId);

  if (!deployment) {
    return c.json({ error: "Deployment not found" }, 404);
  }

  // Load deployment workflow snapshot from R2
  const objectStore = new ObjectStore(c.env.RESSOURCES);
  let workflowData;
  try {
    workflowData = await objectStore.readDeploymentWorkflow(deployment.id);
  } catch (error) {
    console.error(
      `Failed to load deployment workflow from R2 for ${deployment.id}:`,
      error
    );
    return c.json({ error: "Failed to load deployment data" }, 500);
  }

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
deploymentRoutes.get("/:workflowIdOrHandle", jwtMiddleware, async (c) => {
  const organizationId = c.get("organizationId")!;
  const workflowIdOrHandle = c.req.param("workflowIdOrHandle");
  const db = createDatabase(c.env.DB);

  // Check if workflow exists and belongs to the organization
  const workflow = await getWorkflow(db, workflowIdOrHandle, organizationId);
  if (!workflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  // Get the latest deployment
  const deployment = await getLatestDeployment(
    db,
    workflowIdOrHandle,
    organizationId
  );

  if (!deployment) {
    return c.json({ error: "No deployments found for this workflow" }, 404);
  }

  // Load deployment workflow snapshot from R2
  const objectStore = new ObjectStore(c.env.RESSOURCES);
  let workflowData;
  try {
    workflowData = await objectStore.readDeploymentWorkflow(deployment.id);
  } catch (error) {
    console.error(
      `Failed to load deployment workflow from R2 for ${deployment.id}:`,
      error
    );
    return c.json({ error: "Failed to load deployment data" }, 500);
  }

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
deploymentRoutes.post("/:workflowIdOrHandle", jwtMiddleware, async (c) => {
  const organizationId = c.get("organizationId")!;
  const workflowIdOrHandle = c.req.param("workflowIdOrHandle");
  const db = createDatabase(c.env.DB);
  const now = new Date();

  // Check if workflow exists and belongs to the organization
  const workflow = await getWorkflow(db, workflowIdOrHandle, organizationId);
  if (!workflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  // Load full workflow data from R2
  const objectStore = new ObjectStore(c.env.RESSOURCES);
  let workflowData;
  try {
    workflowData = await objectStore.readWorkflow(workflow.id);
  } catch (error) {
    console.error(
      `Failed to load workflow data from R2 for ${workflow.id}:`,
      error
    );
    return c.json({ error: "Failed to load workflow data" }, 500);
  }

  // Get the latest version number and increment
  const latestVersion =
    (await getLatestDeploymentsVersionNumbers(
      db,
      workflowIdOrHandle,
      organizationId
    )) || 0;
  const newVersion = latestVersion + 1;

  // Create new deployment (metadata only in DB)
  const deploymentId = uuid();
  const newDeployment = await createDeployment(db, {
    id: deploymentId,
    organizationId: organizationId,
    workflowId: workflowIdOrHandle,
    version: newVersion,
    createdAt: now,
    updatedAt: now,
  });

  // Save workflow snapshot to R2
  try {
    await objectStore.writeDeploymentWorkflow(deploymentId, workflowData);
  } catch (error) {
    console.error(
      `Failed to save deployment workflow to R2 for ${deploymentId}:`,
      error
    );
    // Consider rolling back the deployment creation here
    return c.json({ error: "Failed to save deployment data" }, 500);
  }

  // Transform to match WorkflowDeploymentVersion type
  const deploymentVersion: DeploymentVersion = {
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
deploymentRoutes.get(
  "/history/:workflowIdOrHandle",
  jwtMiddleware,
  async (c) => {
    const organizationId = c.get("organizationId")!;
    const workflowIdOrHandle = c.req.param("workflowIdOrHandle");
    const db = createDatabase(c.env.DB);

    // Check if workflow exists and belongs to the organization
    const workflow = await getWorkflow(db, workflowIdOrHandle, organizationId);
    if (!workflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    // Get all deployments for this workflow
    const deploymentsList = await getDeployments(
      db,
      workflowIdOrHandle,
      organizationId
    );

    // Load all deployment workflow snapshots from R2 in parallel
    const objectStore = new ObjectStore(c.env.RESSOURCES);
    const deploymentVersions = await Promise.all(
      deploymentsList.map(async (deployment) => {
        let workflowData;
        try {
          workflowData = await objectStore.readDeploymentWorkflow(
            deployment.id
          );
        } catch (error) {
          console.error(
            `Failed to load deployment workflow from R2 for ${deployment.id}:`,
            error
          );
          // Return deployment with empty nodes/edges if R2 read fails
          workflowData = { nodes: [], edges: [] };
        }

        return {
          id: deployment.id,
          workflowId: deployment.workflowId || "",
          version: deployment.version,
          createdAt: deployment.createdAt,
          updatedAt: deployment.updatedAt,
          nodes: workflowData.nodes || [],
          edges: workflowData.edges || [],
        };
      })
    );

    const response: GetWorkflowDeploymentsResponse = {
      workflow: {
        id: workflow.id,
        name: workflow.name,
      },
      deployments: deploymentVersions,
    };

    return c.json(response);
  }
);

/**
 * POST /deployments/version/:deploymentId/execute
 * Executes a specific deployment version
 * Supports both JWT and API key authentication
 */
deploymentRoutes.post(
  "/version/:deploymentId/execute",
  apiKeyOrJwtMiddleware,
  (c, next) => createRateLimitMiddleware(c.env.RATE_LIMIT_EXECUTE)(c, next),
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
      organizationId = c.get("organizationId")!;
      userId = "api"; // Use a placeholder for API-triggered executions
    }

    const deploymentId = c.req.param("deploymentId");
    const db = createDatabase(c.env.DB);

    // Get organization compute credits
    const computeCredits = await getOrganizationComputeCredits(
      db,
      organizationId
    );
    if (computeCredits === undefined) {
      return c.json({ error: "Organization not found" }, 404);
    }

    // Get the deployment
    const deployment = await getDeployment(db, deploymentId, organizationId);

    if (!deployment) {
      return c.json({ error: "Deployment not found" }, 404);
    }

    // Load deployment workflow snapshot from R2
    const objectStore = new ObjectStore(c.env.RESSOURCES);
    let workflowData;
    try {
      workflowData = await objectStore.readDeploymentWorkflow(deployment.id);
    } catch (error) {
      console.error(
        `Failed to load deployment workflow from R2 for ${deployment.id}:`,
        error
      );
      return c.json({ error: "Failed to load deployment data" }, 500);
    }

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
        computeCredits,
        workflow: {
          id: deployment.workflowId || "",
          name: workflowData.name,
          handle: workflowData.handle,
          type: workflowData.type,
          nodes: workflowData.nodes,
          edges: workflowData.edges,
        },
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
      nodeExecutions,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Save execution data to R2
    try {
      await objectStore.writeExecution(initialExecution);
    } catch (error) {
      console.error(`Failed to save execution to R2: ${executionId}`, error);
    }

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
