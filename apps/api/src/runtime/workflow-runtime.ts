/**
 * Workflow Runtime
 *
 * Production runtime implementation using Cloudflare Workflows.
 * Provides the full feature set including all 50+ node types and integrations.
 *
 * ## Architecture
 *
 * Extends WorkflowEntrypoint to provide durable workflow execution.
 * Uses BaseRuntime for core execution logic via composition.
 *
 * - **CloudflareNodeRegistry**: Complete node catalog (50+ nodes including geotiff, AI, etc.)
 * - **CloudflareToolRegistry**: Full tool support with all providers
 * - **WorkflowSessionMonitoringService**: Real-time updates via Durable Objects
 * - **ExecutionStore**: Persistent storage with D1 + R2
 *
 * ## Usage
 *
 * Exported from `index.ts` as "Runtime" for wrangler production configuration:
 * ```ts
 * // wrangler.jsonc
 * "workflows": [{
 *   "binding": "EXECUTE",
 *   "class_name": "Runtime"
 * }]
 * ```
 *
 * @see {@link BaseRuntime} - Base runtime class
 * @see {@link MockRuntime} - Test implementation (src/mocks/mock-runtime.ts)
 */

import type { WorkflowExecution } from "@dafthunk/types";
import {
  WorkflowEntrypoint,
  WorkflowEvent,
  WorkflowStep,
  WorkflowStepConfig,
} from "cloudflare:workers";

import type { Bindings } from "../context";
import { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import { CloudflareToolRegistry } from "../nodes/cloudflare-tool-registry";
import { WorkflowSessionMonitoringService } from "../services/monitoring-service";
import { ExecutionStore } from "../stores/execution-store";
import {
  BaseRuntime,
  type RuntimeDependencies,
  type RuntimeParams,
} from "./base-runtime";
import { ResourceProvider } from "./resource-provider";

/**
 * Workflow runtime with step-based execution.
 * Implements the core workflow execution logic with durable steps.
 */
export class WorkflowRuntime extends BaseRuntime {
  private currentStep?: WorkflowStep;

  private static readonly defaultStepConfig: WorkflowStepConfig = {
    retries: {
      limit: 0,
      delay: 10_000,
      backoff: "exponential",
    },
    timeout: "10 minutes",
  };

  /**
   * Executes the workflow with the given step context.
   */
  async executeWithStep(
    params: RuntimeParams,
    instanceId: string,
    step: WorkflowStep
  ): Promise<WorkflowExecution> {
    this.currentStep = step;
    try {
      return await this.run(params, instanceId);
    } finally {
      this.currentStep = undefined;
    }
  }

  /**
   * Implements step execution using Cloudflare Workflows step.do().
   */
  protected async executeStep<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    if (!this.currentStep) {
      throw new Error("executeStep called without workflow step context");
    }
    // Type assertion needed due to Cloudflare Workflows type constraints
    return (await this.currentStep.do(
      name,
      WorkflowRuntime.defaultStepConfig,
      // @ts-expect-error - TS2345: Cloudflare Workflows requires Serializable types
      fn
    )) as T;
  }
}

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
