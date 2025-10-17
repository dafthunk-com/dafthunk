import { WorkflowExecution } from "./workflow";

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
  executions: Omit<WorkflowExecution, "nodeExecutions">[];
}

/**
 * Response when retrieving a single execution
 */
export interface GetExecutionResponse {
  execution: WorkflowExecution;
}
