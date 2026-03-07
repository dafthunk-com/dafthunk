/**
 * Workflow Runtime Entrypoint
 *
 * Cloudflare Workflows adapter for the WorkflowRuntime execution engine.
 * This is the entrypoint class that Cloudflare Workflows instantiates.
 *
 * ## Architecture
 *
 * Thin adapter layer that:
 * - Extends WorkflowEntrypoint (Cloudflare Workflows base class)
 * - Sets up production dependencies (node registry, resource provider, etc.)
 * - Delegates execution to WorkflowRuntime
 *
 * ## Usage
 *
 * Exported from `index.ts` as "Runtime" for wrangler configuration:
 * ```ts
 * // wrangler.jsonc
 * "workflows": [{
 *   "binding": "EXECUTE",
 *   "class_name": "Runtime"
 * }]
 * ```
 *
 * @see {@link WorkflowRuntime} - Core runtime execution logic
 */

import {
  WorkflowEntrypoint,
  WorkflowEvent,
  WorkflowStep,
} from "cloudflare:workers";
import type { RuntimeParams } from "@dafthunk/runtime";
import type { WorkflowExecution } from "@dafthunk/types";
import type { Bindings } from "../context";
import {
  createWorkflowRuntime,
  type WorkflowRuntime,
} from "./cloudflare-workflow-runtime";

/**
 * Workflow entrypoint for Cloudflare Workflows.
 * Adapter that connects Cloudflare Workflows API to the runtime execution engine.
 */
export class WorkflowRuntimeEntrypoint extends WorkflowEntrypoint<
  Bindings,
  RuntimeParams
> {
  private runtime: WorkflowRuntime<Bindings>;

  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.runtime = createWorkflowRuntime(env);
  }

  /**
   * Workflow entrypoint called by Cloudflare Workflows engine.
   */
  async run(
    event: WorkflowEvent<RuntimeParams>,
    step: WorkflowStep
  ): Promise<WorkflowExecution> {
    const params = event.payload;
    console.log(
      `[WorkflowEntrypoint] run instanceId=${event.instanceId} workflow=${params.workflow.id} trigger=${params.workflow.trigger} nodes=${params.workflow.nodes.length} telegramMessage=${!!params.telegramMessage} telegramBotToken=${!!params.telegramBotToken}`
    );
    try {
      const result = await this.runtime.executeWithStep(
        params,
        event.instanceId,
        step
      );
      console.log(
        `[WorkflowEntrypoint] done instanceId=${event.instanceId} status=${result.status} error=${result.error ?? "none"}`
      );
      return result;
    } catch (error) {
      console.error(
        `[WorkflowEntrypoint] error instanceId=${event.instanceId}`,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }
}
