/**
 * Workflow Runtime
 *
 * Runtime implementation for Cloudflare Workflows (durable execution).
 * Executes workflows with step-based durability using Cloudflare Workflows API.
 *
 * ## Architecture
 *
 * Extends Runtime with durable step execution:
 * - Each step is persisted and can be retried independently
 * - Execution survives Worker restarts
 * - Integrates with Cloudflare Workflows engine
 *
 * ## Usage
 *
 * Used by WorkflowRuntimeEntrypoint for production execution.
 * For direct testing, use WorkerRuntime instead.
 *
 * @see {@link Runtime} - Abstract runtime class
 * @see {@link WorkflowRuntimeEntrypoint} - Cloudflare Workflows adapter
 * @see {@link WorkerRuntime} - Non-durable Worker implementation
 */

import { WorkflowStep, WorkflowStepConfig } from "cloudflare:workers";
import type { WorkflowExecution } from "@dafthunk/types";

import type { Bindings } from "../context";
import { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import { CloudflareToolRegistry } from "../nodes/cloudflare-tool-registry";
import { WorkflowSessionMonitoringService } from "../services/monitoring-service";
import { CloudflareExecutionStore } from "../stores/execution-store";
import { R2ObjectStore } from "../stores/object-store";
import {
  Runtime,
  type RuntimeDependencies,
  type RuntimeParams,
} from "@dafthunk/runtime";
import {
  CloudflareParameterMapper,
  CloudflareWorkflowValidator,
} from "./cloudflare-adapters";
import { CloudflareCreditService } from "./credit-service";
import { CloudflareResourceProvider } from "./resource-provider";

/**
 * Workflow runtime with step-based execution.
 * Implements the core workflow execution logic with durable steps.
 */
export class WorkflowRuntime extends Runtime {
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

    // Create object store for blob storage
    const objectStore = new R2ObjectStore(env.RESSOURCES);

    // Create tool registry with factory function
    // eslint-disable-next-line prefer-const -- circular dependency pattern requires let
    let resourceProvider: CloudflareResourceProvider;
    const toolRegistry = new CloudflareToolRegistry(
      nodeRegistry,
      (nodeId: string, inputs: Record<string, any>) =>
        resourceProvider.createToolContext(nodeId, inputs)
    );

    // Create CloudflareResourceProvider with production tool registry and object store
    resourceProvider = new CloudflareResourceProvider(
      env,
      toolRegistry,
      objectStore
    );

    // Create production-ready dependencies
    const dependencies: RuntimeDependencies = {
      nodeRegistry,
      parameterMapper: new CloudflareParameterMapper(objectStore),
      workflowValidator: new CloudflareWorkflowValidator(),
      resourceProvider,
      executionStore: new CloudflareExecutionStore(env),
      objectStore,
      monitoringService: new WorkflowSessionMonitoringService(
        env.WORKFLOW_SESSION
      ),
      creditService: new CloudflareCreditService(
        env.KV,
        env.CLOUDFLARE_ENV === "development"
      ),
    };

    return new WorkflowRuntime(dependencies);
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
