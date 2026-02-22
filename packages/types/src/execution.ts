import { ExecutionFeedback } from "./evaluation";
import { WorkflowExecution } from "./workflow";

/**
 * Execution status types (for database storage)
 */
export const ExecutionStatus = {
  STARTED: "started",
  EXECUTING: "executing",
  COMPLETED: "completed",
  ERROR: "error",
  CANCELLED: "cancelled",
} as const;

export type ExecutionStatusType =
  (typeof ExecutionStatus)[keyof typeof ExecutionStatus];

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
  feedback?: ExecutionFeedback[];
}
