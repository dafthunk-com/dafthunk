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
import type { WorkflowExecution } from "@dafthunk/types";

import type { Bindings } from "../context";
import { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import { CloudflareToolRegistry } from "../nodes/cloudflare-tool-registry";
import { WorkflowSessionMonitoringService } from "../services/monitoring-service";
import { ExecutionStore } from "../stores/execution-store";
import type { RuntimeDependencies, RuntimeParams } from "./base-runtime";
import { ResourceProvider } from "./resource-provider";
import { WorkflowRuntime } from "./workflow-runtime";

/**
 * Workflow entrypoint for Cloudflare Workflows.
 * Adapter that connects Cloudflare Workflows API to the runtime execution engine.
 */
export class WorkflowRuntimeEntrypoint extends WorkflowEntrypoint<
  Bindings,
  RuntimeParams
> {
  private runtime: WorkflowRuntime;

  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);

    // Create production dependencies
    const nodeRegistry = new CloudflareNodeRegistry(env, true);

    // Create tool registry with factory function
    // eslint-disable-next-line prefer-const -- circular dependency pattern requires let
    let resourceProvider: ResourceProvider;
    const toolRegistry = new CloudflareToolRegistry(
      nodeRegistry,
      (nodeId: string, inputs: Record<string, any>) =>
        resourceProvider.createToolContext(nodeId, inputs)
    );

    // Create ResourceProvider with production tool registry
    resourceProvider = new ResourceProvider(env, toolRegistry);

    // Create production-ready dependencies
    const dependencies: RuntimeDependencies = {
      nodeRegistry,
      resourceProvider,
      executionStore: new ExecutionStore(env),
      monitoringService: new WorkflowSessionMonitoringService(
        env.WORKFLOW_SESSION
      ),
    };

    // Create runtime with dependencies
    this.runtime = new WorkflowRuntime(env, dependencies);
  }

  /**
   * Workflow entrypoint called by Cloudflare Workflows engine.
   */
  async run(
    event: WorkflowEvent<RuntimeParams>,
    step: WorkflowStep
  ): Promise<WorkflowExecution> {
    return await this.runtime.executeWithStep(
      event.payload,
      event.instanceId,
      step
    );
  }
}
