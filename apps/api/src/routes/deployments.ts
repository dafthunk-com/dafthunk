import {
  Deployment,
  DeploymentVersion,
  ExecuteDeploymentResponse,
  GetDeploymentVersionResponse,
  GetWorkflowDeploymentsResponse,
  ListDeploymentsResponse,
} from "@dafthunk/types";
import { JWTTokenPayload } from "@dafthunk/types";
import { Hono } from "hono";
import { v7 as uuid } from "uuid";

import { apiKeyOrJwtMiddleware, jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import { createDatabase } from "../db";
import {
  createDeployment,
  getDeployments,
  getDeploymentsGroupedByWorkflow,
  getDeploymentWithData,
  getLatestDeployment,
  getLatestDeploymentsVersionNumbers,
  getOrganizationComputeCredits,
} from "../db";
import { createRateLimitMiddleware } from "../middleware/rate-limit";
import { ObjectStore } from "../runtime/object-store";
import { WorkflowStore } from "../runtime/workflow-store";
import { WorkflowExecutor } from "../services/workflow-executor";
import { getAuthContext } from "../utils/auth-context";
import {
  isExecutionPreparationError,
  prepareWorkflowExecution,
} from "../utils/execution-preparation";

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
  const objectStore = new ObjectStore(c.env.RESSOURCES);

  const deployment = await getDeploymentWithData(
    db,
    objectStore,
    deploymentId,
    organizationId
  );

  if (!deployment) {
    return c.json({ error: "Deployment not found" }, 404);
  }

  // Transform to match WorkflowDeploymentVersion type
  const deploymentVersion: GetDeploymentVersionResponse = {
    id: deployment.id,
    workflowId: deployment.workflowId || "",
    type: deployment.workflowData.type,
    version: deployment.version,
    createdAt: deployment.createdAt,
    updatedAt: deployment.updatedAt,
    nodes: deployment.workflowData.nodes || [],
    edges: deployment.workflowData.edges || [],
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
    type: workflowData.type,
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
  const workflowStore = new WorkflowStore(c.env.DB, c.env.RESSOURCES);
  const db = createDatabase(c.env.DB);
  const objectStore = new ObjectStore(c.env.RESSOURCES);
  const now = new Date();

  // Load workflow with data from D1 and R2
  const workflowWithData = await workflowStore.getWithData(
    workflowIdOrHandle,
    organizationId
  );
  if (!workflowWithData) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  const _workflow = workflowWithData;
  const workflowData = workflowWithData.data;

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
    type: workflowData.type,
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
    const workflowStore = new WorkflowStore(c.env.DB, c.env.RESSOURCES);

    // Check if workflow exists and belongs to the organization
    const workflow = await workflowStore.get(
      workflowIdOrHandle,
      organizationId
    );
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
          type: workflowData.type || "manual",
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
    // Get auth context from either JWT or API key
    const { organizationId, userId } = getAuthContext(c);

    const deploymentId = c.req.param("deploymentId");
    const db = createDatabase(c.env.DB);
    const objectStore = new ObjectStore(c.env.RESSOURCES);

    // Get organization compute credits
    const computeCredits = await getOrganizationComputeCredits(
      db,
      organizationId
    );
    if (computeCredits === undefined) {
      return c.json({ error: "Organization not found" }, 404);
    }

    // Get the deployment with workflow data
    const deployment = await getDeploymentWithData(
      db,
      objectStore,
      deploymentId,
      organizationId
    );

    if (!deployment) {
      return c.json({ error: "Deployment not found" }, 404);
    }

    const workflowData = deployment.workflowData;

    // Prepare workflow for execution
    const preparationResult = await prepareWorkflowExecution(c, workflowData);
    if (isExecutionPreparationError(preparationResult)) {
      return c.json(
        { error: preparationResult.error },
        preparationResult.status
      );
    }

    const { parameters } = preparationResult;

    // Execute workflow using shared service
    const { execution } = await WorkflowExecutor.execute({
      workflow: {
        id: deployment.workflowId || "",
        name: workflowData.name,
        handle: workflowData.handle,
        type: workflowData.type,
        nodes: workflowData.nodes,
        edges: workflowData.edges,
      },
      userId,
      organizationId,
      computeCredits,
      deploymentId: deployment.id,
      parameters,
      env: c.env,
    });

    const response: ExecuteDeploymentResponse = {
      id: execution.id,
      workflowId: execution.workflowId,
      deploymentId: deployment.id,
      status: "executing",
      nodeExecutions: execution.nodeExecutions.map((ne) => ({
        nodeId: ne.nodeId,
        status: "idle" as const,
      })),
    };

    return c.json(response, 201);
  }
);

export default deploymentRoutes;
