import { Hono } from "hono";
import {
  Workflow as WorkflowType,
  WorkflowDeployment,
  WorkflowDeploymentVersion,
} from "@dafthunk/types";
import { ApiContext, CustomJWTPayload } from "../context";
import { createDatabase } from "../db";
import { jwtAuth } from "../auth";
import {
  getLatestDeploymentByWorkflowId,
  getDeploymentById,
  getWorkflowById,
  createDeployment,
  getDeploymentsGroupedByWorkflow,
  getDeploymentsByWorkflowId,
  getLatestVersionNumberByWorkflowId,
} from "../utils/db";
import { v7 as uuid } from "uuid";

const deploymentRoutes = new Hono<ApiContext>();

/**
 * GET /deployments
 * Returns deployments grouped by workflow with counts and latest ID
 */
deploymentRoutes.get("/", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const db = createDatabase(c.env.DB);

  const groupedDeployments = await getDeploymentsGroupedByWorkflow(
    db,
    user.organizationId
  );

  // Transform to match WorkflowDeployment type
  const typedDeployments: WorkflowDeployment[] = groupedDeployments;

  return c.json({ workflows: typedDeployments });
});

/**
 * GET /deployments/version/:deploymentUUID
 * Returns a specific deployment by UUID
 */
deploymentRoutes.get("/version/:deploymentUUID", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const deploymentUUID = c.req.param("deploymentUUID");
  const db = createDatabase(c.env.DB);

  const deployment = await getDeploymentById(
    db,
    deploymentUUID,
    user.organizationId
  );

  if (!deployment) {
    return c.json({ error: "Deployment not found" }, 404);
  }

  const workflowData = deployment.workflowData as WorkflowType;

  // Transform to match WorkflowDeploymentVersion type
  const deploymentVersion: WorkflowDeploymentVersion = {
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
deploymentRoutes.get("/:workflowUUID", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const workflowUUID = c.req.param("workflowUUID");
  const db = createDatabase(c.env.DB);

  // Check if workflow exists and belongs to the organization
  const workflow = await getWorkflowById(db, workflowUUID, user.organizationId);
  if (!workflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  // Get the latest deployment
  const deployment = await getLatestDeploymentByWorkflowId(
    db,
    workflowUUID,
    user.organizationId
  );

  if (!deployment) {
    return c.json({ error: "No deployments found for this workflow" }, 404);
  }

  const workflowData = deployment.workflowData as WorkflowType;

  // Transform to match WorkflowDeploymentVersion type
  const deploymentVersion: WorkflowDeploymentVersion = {
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
deploymentRoutes.post("/:workflowUUID", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const workflowUUID = c.req.param("workflowUUID");
  const db = createDatabase(c.env.DB);
  const now = new Date();

  // Check if workflow exists and belongs to the organization
  const workflow = await getWorkflowById(db, workflowUUID, user.organizationId);
  if (!workflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  const workflowData = workflow.data as WorkflowType;

  // Get the latest version number and increment
  const latestVersion =
    (await getLatestVersionNumberByWorkflowId(
      db,
      workflowUUID,
      user.organizationId
    )) || 0;
  const newVersion = latestVersion + 1;

  // Create new deployment
  const deploymentId = uuid();
  const newDeployment = await createDeployment(db, {
    id: deploymentId,
    organizationId: user.organizationId,
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
deploymentRoutes.get("/history/:workflowUUID", jwtAuth, async (c) => {
  const user = c.get("jwtPayload") as CustomJWTPayload;
  const workflowUUID = c.req.param("workflowUUID");
  const db = createDatabase(c.env.DB);

  // Check if workflow exists and belongs to the organization
  const workflow = await getWorkflowById(db, workflowUUID, user.organizationId);
  if (!workflow) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  // Get all deployments for this workflow
  const deploymentsList = await getDeploymentsByWorkflowId(
    db,
    workflowUUID,
    user.organizationId
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

  return c.json({
    workflow: {
      id: workflow.id,
      name: workflow.name,
    },
    deployments: deploymentVersions,
  });
});

export default deploymentRoutes;
