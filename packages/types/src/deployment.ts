import {
  Edge,
  Node,
  Workflow,
  WorkflowRuntime,
  WorkflowTrigger,
} from "./workflow";

/**
 * Represents a group of deployments for a workflow
 * Used for listing deployments grouped by workflow
 */
export interface Deployment {
  workflowId: string;
  workflowName: string;
  workflowTrigger: WorkflowTrigger;
  latestDeploymentId: string;
  latestVersion: number;
  deploymentCount: number;
  latestCreatedAt: string | Date;
}

/**
 * Represents a specific deployment version of a workflow
 * Used for deployment details and execution
 */
export interface DeploymentVersion {
  id: string;
  workflowId: string;
  trigger: WorkflowTrigger;
  runtime?: WorkflowRuntime;
  version: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  nodes: Node[];
  edges: Edge[];
}

/**
 * Response for listing all deployments grouped by workflow
 */
export interface ListDeploymentsResponse {
  workflows: Deployment[];
}

/**
 * Response for retrieving a specific deployment version
 * This is just an alias for WorkflowDeploymentVersion
 */
export type GetDeploymentVersionResponse = DeploymentVersion;

/**
 * Response for listing all deployments for a specific workflow
 */
export interface GetWorkflowDeploymentsResponse {
  workflow: Pick<Workflow, "id" | "name">;
  deployments: DeploymentVersion[];
}

/**
 * Response when initiating a deployment execution
 */
export interface ExecuteDeploymentResponse {
  id: string;
  workflowId: string;
  deploymentId: string;
  status: "executing" | "completed";
  nodeExecutions: Array<{
    nodeId: string;
    status: "idle" | "completed";
  }>;
}
