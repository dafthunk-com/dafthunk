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
import { getOrganizationComputeCredits } from "../db";
import { createRateLimitMiddleware } from "../middleware/rate-limit";
import { WorkflowExecutor } from "../services/workflow-executor";
import { DeploymentStore } from "../stores/deployment-store";
import { WorkflowStore } from "../stores/workflow-store";
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
  const deploymentStore = new DeploymentStore(c.env);

  const groupedDeployments =
    await deploymentStore.getGroupedByWorkflow(organizationId);

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
  const deploymentStore = new DeploymentStore(c.env);

  const deployment = await deploymentStore.getWithData(
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
  const deploymentStore = new DeploymentStore(c.env);

  // Get the latest deployment
  const deployment = await deploymentStore.getLatest(
    workflowIdOrHandle,
    organizationId
  );

  if (!deployment) {
    return c.json({ error: "No deployments found for this workflow" }, 404);
  }

  // Load deployment workflow snapshot from R2
  const workflowData = await deploymentStore.readWorkflowSnapshot(
    deployment.id
  );

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
  const workflowStore = new WorkflowStore(c.env);
  const deploymentStore = new DeploymentStore(c.env);
  const now = new Date();

  // Load workflow with data from D1 and R2
  const workflowWithData = await workflowStore.getWithData(
    workflowIdOrHandle,
    organizationId
  );
  if (!workflowWithData) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  const workflowData = workflowWithData.data;
  const workflowId = workflowWithData.id;

  // Get the latest version number and increment
  const latestVersion =
    (await deploymentStore.getLatestVersionNumber(
      workflowId,
      organizationId
    )) || 0;
  const newVersion = latestVersion + 1;

  // Create new deployment (metadata only in DB)
  const deploymentId = uuid();
  const newDeployment = await deploymentStore.create({
    id: deploymentId,
    organizationId: organizationId,
    workflowId: workflowId,
    version: newVersion,
    createdAt: now,
    updatedAt: now,
  });

  // Save workflow snapshot to R2
  await deploymentStore.writeWorkflowSnapshot(deploymentId, workflowData);

  // Automatically activate this deployment
  await workflowStore.setActiveDeployment(
    workflowId,
    organizationId,
    deploymentId
  );

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
    const workflowStore = new WorkflowStore(c.env);
    const deploymentStore = new DeploymentStore(c.env);

    // Check if workflow exists and belongs to the organization
    const workflow = await workflowStore.get(
      workflowIdOrHandle,
      organizationId
    );
    if (!workflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    // Get all deployments for this workflow
    const deploymentsList = await deploymentStore.listByWorkflow(
      workflow.id,
      organizationId
    );

    // Load all deployment workflow snapshots from R2 in parallel
    // TODO: We should not load the data from R2, instead we should have a get endpoint for this
    const deploymentVersions = await Promise.all(
      deploymentsList.map(async (deployment) => {
        const workflowData = await deploymentStore.readWorkflowSnapshot(
          deployment.id
        );

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
 * PUT /deployments/version/:deploymentId/activate
 * Activates a specific deployment version for production use
 */
deploymentRoutes.put(
  "/version/:deploymentId/activate",
  jwtMiddleware,
  async (c) => {
    const organizationId = c.get("organizationId")!;
    const deploymentId = c.req.param("deploymentId");
    const deploymentStore = new DeploymentStore(c.env);
    const workflowStore = new WorkflowStore(c.env);

    // Verify deployment exists and belongs to organization
    const deployment = await deploymentStore.get(deploymentId, organizationId);
    if (!deployment) {
      return c.json({ error: "Deployment not found" }, 404);
    }

    // Set this deployment as active for the workflow
    await workflowStore.setActiveDeployment(
      deployment.workflowId!,
      organizationId,
      deploymentId
    );

    return c.json({ success: true, deploymentId });
  }
);

/**
 * PUT /deployments/:workflowIdOrHandle/deactivate
 * Deactivates the current active deployment for a workflow
 */
deploymentRoutes.put(
  "/:workflowIdOrHandle/deactivate",
  jwtMiddleware,
  async (c) => {
    const organizationId = c.get("organizationId")!;
    const workflowIdOrHandle = c.req.param("workflowIdOrHandle");
    const workflowStore = new WorkflowStore(c.env);

    // Verify workflow exists and belongs to organization
    const workflow = await workflowStore.get(
      workflowIdOrHandle,
      organizationId
    );
    if (!workflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    // Clear active deployment
    await workflowStore.setActiveDeployment(
      workflowIdOrHandle,
      organizationId,
      null
    );

    return c.json({ success: true });
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
    const deploymentStore = new DeploymentStore(c.env);

    // Get organization compute credits
    const computeCredits = await getOrganizationComputeCredits(
      db,
      organizationId
    );
    if (computeCredits === undefined) {
      return c.json({ error: "Organization not found" }, 404);
    }

    // Get the deployment with workflow data
    const deployment = await deploymentStore.getWithData(
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
