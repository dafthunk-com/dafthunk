/**
 * Mock Execution Store
 *
 * In-memory implementation of ExecutionStore that doesn't require database access.
 * Useful for workflow integration tests that focus on node execution logic
 * rather than persistence.
 */

import type { WorkflowExecution } from "@dafthunk/types";

import type { ExecutionStore } from "../stores/execution-store";

export class MockExecutionStore implements Partial<ExecutionStore> {
  private executions: Map<string, WorkflowExecution> = new Map();

  async save(execution: WorkflowExecution): Promise<WorkflowExecution> {
    // Store in memory for test verification
    this.executions.set(execution.id, execution);
    return execution;
  }

  async get(id: string): Promise<WorkflowExecution | null> {
    return this.executions.get(id) ?? null;
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
