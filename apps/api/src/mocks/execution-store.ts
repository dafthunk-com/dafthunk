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
  ListExecutionsOptions,
  SaveExecutionRecord,
} from "../runtime/cloudflare-execution-store";

export class MockExecutionStore implements ExecutionStore {
  private executions: Map<string, WorkflowExecution> = new Map();
  private rows: Map<string, ExecutionRow> = new Map();

  async save(record: SaveExecutionRecord): Promise<WorkflowExecution> {
    // Store execution row for test verification
    const usage = record.nodeExecutions.reduce(
      (sum, ne) => sum + (ne.usage ?? 0),
      0
    );
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
      usage,
    };
    this.rows.set(record.id, row);

    // Store full execution for test verification
    const execution: WorkflowExecution = {
      id: record.id,
      workflowId: record.workflowId,
      deploymentId: record.deploymentId,
      status: record.status,
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

  async getWithData(
    id: string,
    organizationId: string
  ): Promise<(ExecutionRow & { data: WorkflowExecution }) | undefined> {
    const row = this.rows.get(id);
    const execution = this.executions.get(id);
    if (!row || !execution || row.organizationId !== organizationId) {
      return undefined;
    }
    return { ...row, data: execution };
  }

  async list(
    organizationId: string,
    _options?: ListExecutionsOptions
  ): Promise<ExecutionRow[]> {
    return Array.from(this.rows.values()).filter(
      (row) => row.organizationId === organizationId
    );
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
