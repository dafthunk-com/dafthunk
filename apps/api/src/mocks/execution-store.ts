/**
 * Mock Execution Store
 *
 * In-memory implementation of ExecutionStore that doesn't require database access.
 * Useful for workflow integration tests that focus on node execution logic
 * rather than persistence.
 */

import type { WorkflowExecution } from "@dafthunk/types";

import type {
  ExecutionRow,
  ExecutionStore,
  SaveExecutionRecord,
} from "../stores/execution-store";

export class MockExecutionStore implements Partial<ExecutionStore> {
  private executions: Map<string, WorkflowExecution> = new Map();
  private rows: Map<string, ExecutionRow> = new Map();

  async save(record: SaveExecutionRecord): Promise<WorkflowExecution> {
    // Store execution row for test verification
    const row: ExecutionRow = {
      id: record.id,
      workflowId: record.workflowId,
      deploymentId: record.deploymentId ?? null,
      organizationId: record.organizationId,
      status: record.status,
      error: record.error ?? null,
      startedAt: record.startedAt ?? null,
      endedAt: record.endedAt ?? null,
      createdAt: record.createdAt ?? new Date(),
      updatedAt: record.updatedAt ?? new Date(),
    };
    this.rows.set(record.id, row);

    // Store full execution for test verification
    const execution: WorkflowExecution = {
      id: record.id,
      workflowId: record.workflowId,
      deploymentId: record.deploymentId,
      status: record.status as any,
      nodeExecutions: record.nodeExecutions,
      error: record.error,
      startedAt: record.startedAt,
      endedAt: record.endedAt,
    };
    this.executions.set(record.id, execution);
    return execution;
  }

  async get(
    id: string,
    organizationId: string
  ): Promise<ExecutionRow | undefined> {
    const row = this.rows.get(id);
    return row?.organizationId === organizationId ? row : undefined;
  }

  /**
   * Get all saved executions for test verification
   */
  getAll(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }

  /**
   * Clear all stored executions
   */
  clear(): void {
    this.executions.clear();
  }
}
