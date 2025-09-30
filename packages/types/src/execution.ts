import { WorkflowExecution } from "./workflow";
import { Edge, Node } from "./workflow";

/**
 * Request to filter executions
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
