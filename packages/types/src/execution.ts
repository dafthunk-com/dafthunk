// Execution types
import { WorkflowExecution } from "./workflow";
import { Node, Edge } from "./workflow";

/**
 * Request for filtering executions
 */
export interface ListExecutionsRequest {
  workflowId?: string;
  deploymentId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Response for listing executions
 */
export interface ListExecutionsResponse {
  executions: WorkflowExecution[];
}

/**
 * Response when retrieving a single execution
 */
export interface GetExecutionResponse {
  execution: WorkflowExecution;
}

/**
 * Public execution with workflow structure
 */
export interface PublicExecutionWithStructure extends WorkflowExecution {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Response when retrieving a public execution
 */
export interface GetPublicExecutionResponse {
  execution: PublicExecutionWithStructure;
}

/**
 * Response when updating execution visibility
 */
export interface UpdateExecutionVisibilityResponse {
  success: boolean;
  message: string;
}
