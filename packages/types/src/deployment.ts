// Deployment types
import { WorkflowDeployment, WorkflowDeploymentVersion, Workflow } from "./workflow";

/**
 * Response for listing all deployments grouped by workflow
 */
export interface ListDeploymentsResponse {
  workflows: WorkflowDeployment[];
}

/**
 * Response for retrieving a specific deployment version
 */
export interface GetDeploymentVersionResponse extends WorkflowDeploymentVersion {}

/**
 * Response for listing all deployments for a specific workflow
 */
export interface GetWorkflowDeploymentsResponse {
  workflow: {
    id: string;
    name: string;
  };
  deployments: WorkflowDeploymentVersion[];
}

/**
 * Request to execute a specific deployment
 * Can include different types of data depending on the HTTP request
 */
export interface ExecuteDeploymentRequest {
  // Optional query parameter
  monitorProgress?: boolean;
  // Body data can be any JSON
  [key: string]: any;
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

/**
 * HTTP Request information passed to the workflow execution
 */
export interface HttpRequestInfo {
  url: string;
  method: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  formData?: Record<string, string | File>;
  body?: any;
}

/**
 * Parameters passed to the workflow execution runtime
 */
export interface ExecutionRuntimeParams {
  userId: string;
  organizationId: string;
  workflow: {
    id: string;
    name: string;
    nodes: Workflow["nodes"];
    edges: Workflow["edges"];
  };
  monitorProgress: boolean;
  deploymentId: string;
  httpRequest: HttpRequestInfo;
} 