import {
  WorkflowDeployment,
  WorkflowDeploymentVersion,
  Workflow,
} from "./workflow";

/**
 * Response for listing all deployments grouped by workflow
 */
export interface ListDeploymentsResponse {
  workflows: WorkflowDeployment[];
}

/**
 * Response for retrieving a specific deployment version
 * This is just an alias for WorkflowDeploymentVersion
 */
export type GetDeploymentVersionResponse = WorkflowDeploymentVersion;

/**
 * Response for listing all deployments for a specific workflow
 */
export interface GetWorkflowDeploymentsResponse {
  workflow: Pick<Workflow, "id" | "name">;
  deployments: WorkflowDeploymentVersion[];
}

/**
 * Response when initiating a deployment execution
 */
export interface ExecuteDeploymentResponse {
  id: string;
  workflowId: string;
  deploymentId: string;
  status: "executing";
  nodeExecutions: Array<{
    nodeId: string;
    status: "idle";
  }>;
}
