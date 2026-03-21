/**
 * Workflow Runtime Entrypoint
 *
 * AgentWorkflow adapter for the WorkflowRuntime execution engine.
 * Extends AgentWorkflow to enable Agent-Workflow communication via
 * reportProgress/onWorkflowProgress callbacks.
 *
 * Exported from `index.ts` as "Runtime" for wrangler configuration.
 *
 * @see {@link WorkflowRuntime} - Core runtime execution logic
 */

import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import type { RuntimeParams } from "@dafthunk/runtime";
import type { WorkflowExecution } from "@dafthunk/types";
import { AgentWorkflow } from "agents/workflows";
import type { Bindings } from "../context";
import {
  createWorkflowRuntime,
  type WorkflowRuntime,
} from "./cloudflare-workflow-runtime";

// Internal params injected by Agent.runWorkflow() — matches AgentWorkflowParams<T>
// from the agents SDK (not directly importable due to bundled d.ts resolution issues).
interface WorkflowParams extends RuntimeParams {
  __agentName: string;
  __agentBinding: string;
  __workflowName: string;
}

// AgentWorkflow has private members that prevent direct generic extension
// with our Bindings type. Cast to a plain constructor type.
const AgentWorkflowBase = AgentWorkflow as unknown as new (
  ctx: ExecutionContext,
  env: Bindings
) => AgentWorkflow & {
  env: Bindings;
  reportProgress(progress: WorkflowExecution): Promise<void>;
};

export class WorkflowRuntimeEntrypoint extends AgentWorkflowBase {
  async run(
    event: WorkflowEvent<WorkflowParams>,
    step: WorkflowStep
  ): Promise<WorkflowExecution> {
    const params = event.payload;
    console.log(
      `[WorkflowRuntime] run instanceId=${event.instanceId} workflow=${params.workflow.id} trigger=${params.workflow.trigger} nodes=${params.workflow.nodes.length}`
    );
    try {
      const runtime: WorkflowRuntime<Bindings> = createWorkflowRuntime(
        this.env,
        (exec) => this.reportProgress(exec)
      );
      const result = await runtime.executeWithStep(
        params,
        event.instanceId,
        step
      );
      console.log(
        `[WorkflowRuntime] done instanceId=${event.instanceId} status=${result.status} error=${result.error ?? "none"}`
      );
      return result;
    } catch (error) {
      console.error(
        `[WorkflowRuntime] error instanceId=${event.instanceId}`,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }
}
