/**
 * Workflow Runtime
 *
 * Factory for creating a WorkflowRuntime wired with Cloudflare production
 * dependencies. Used by WorkflowRuntimeEntrypoint (AgentWorkflow) to execute
 * workflows with real-time progress reporting back to the originating Agent.
 */

import { type MonitoringService, WorkflowRuntime } from "@dafthunk/runtime";
import type { WorkflowExecution } from "@dafthunk/types";

import type { Bindings } from "../context";
import { buildDependencies } from "./cloudflare-runtime-dependencies";

export { WorkflowRuntime } from "@dafthunk/runtime";

/**
 * Creates a WorkflowRuntime for AgentWorkflow execution.
 * Monitoring updates flow through reportProgress → onWorkflowProgress → WS clients.
 */
export function createWorkflowRuntime(
  env: Bindings,
  reportProgress: (execution: WorkflowExecution) => Promise<void>
): WorkflowRuntime<Bindings> {
  const monitoringService: MonitoringService = {
    async sendUpdate(execution) {
      await reportProgress(execution);
    },
  };
  return new WorkflowRuntime(env, buildDependencies(env, monitoringService));
}
