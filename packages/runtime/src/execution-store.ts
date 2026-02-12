import type {
  NodeExecution,
  WorkflowExecution,
  WorkflowExecutionStatus,
} from "@dafthunk/types";

/**
 * Execution metadata row structure
 */
export interface ExecutionRow {
  id: string;
  workflowId: string;
  deploymentId: string | null;
  organizationId: string;
  status: WorkflowExecutionStatus;
  error: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  usage: number;
}

/**
 * Data required to save an execution record
 */
export interface SaveExecutionRecord {
  id: string;
  workflowId: string;
  deploymentId?: string;
  userId: string;
  organizationId: string;
  status: WorkflowExecutionStatus;
  nodeExecutions: NodeExecution[];
  error?: string;
  createdAt?: Date;
  updatedAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
}

/**
 * Options for listing executions
 */
export interface ListExecutionsOptions {
  workflowId?: string;
  deploymentId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Execution store abstraction for persisting and querying workflow executions.
 */
export interface ExecutionStore {
  save(record: SaveExecutionRecord): Promise<WorkflowExecution>;
  get(id: string, organizationId: string): Promise<ExecutionRow | undefined>;
  getWithData(
    id: string,
    organizationId: string
  ): Promise<(ExecutionRow & { data: WorkflowExecution }) | undefined>;
  list(
    organizationId: string,
    options?: ListExecutionsOptions
  ): Promise<ExecutionRow[]>;
}
