/**
 * Mock Monitoring Service
 *
 * Mock implementation of MonitoringService for testing.
 * Captures all updates sent during test execution for verification.
 */

import type { WorkflowExecution } from "@dafthunk/types";

import type { MonitoringService } from "../runtime/monitoring-service";

export class MockMonitoringService implements MonitoringService {
  public readonly updates: WorkflowExecution[] = [];

  async sendUpdate(
    sessionId: string | undefined,
    execution: WorkflowExecution
  ): Promise<void> {
    if (sessionId) {
      this.updates.push(execution);
    }
  }

  /**
   * Clears all captured updates. Useful for test setup.
   */
  clear(): void {
    this.updates.length = 0;
  }
}
