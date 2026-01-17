/**
 * Workflow Runtime
 *
 * Runtime implementation for Cloudflare Workflows (durable execution).
 * Executes workflows with step-based durability using Cloudflare Workflows API.
 *
 * ## Architecture
 *
 * Extends BaseRuntime with durable step execution:
 * - Each step is persisted and can be retried independently
 * - Execution survives Worker restarts
 * - Integrates with Cloudflare Workflows engine
 *
 * ## Usage
 *
 * Used by WorkflowRuntimeEntrypoint for production execution.
 * For direct testing, use WorkerRuntime instead.
 *
 * @see {@link BaseRuntime} - Base runtime class
 * @see {@link WorkflowRuntimeEntrypoint} - Cloudflare Workflows adapter
 * @see {@link WorkerRuntime} - Non-durable Worker implementation
 */

import { WorkflowStep, WorkflowStepConfig } from "cloudflare:workers";
import type { WorkflowExecution } from "@dafthunk/types";

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
   * Static factory method to create a WorkflowRuntime with production dependencies.
   *
   * Use this factory when instantiating WorkflowRuntime outside of tests.
   * For testing, inject mock dependencies via the constructor directly.
   */
  static create(env: Bindings): WorkflowRuntime {
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

    return new WorkflowRuntime(env, dependencies);
  }

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
