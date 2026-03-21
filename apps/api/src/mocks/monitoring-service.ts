/**
 * Mock Monitoring Service
 *
 * Mock implementation of MonitoringService for testing.
 * Captures all updates sent during test execution for verification.
 */

import type { MonitoringService } from "@dafthunk/runtime";
import type { WorkflowExecution } from "@dafthunk/types";

export class MockMonitoringService implements MonitoringService {
  public readonly updates: WorkflowExecution[] = [];

  async sendUpdate(execution: WorkflowExecution): Promise<void> {
    this.updates.push(execution);
  }

  clear(): void {
    this.updates.length = 0;
  }
}
