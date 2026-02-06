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
 * @see {@link Runtime} - Base runtime class
 * @see {@link WorkflowRuntimeEntrypoint} - Cloudflare Workflows adapter
 * @see {@link WorkerRuntime} - Non-durable Worker implementation
 */

import { WorkflowStep, WorkflowStepConfig } from "cloudflare:workers";
import type { WorkflowExecution } from "@dafthunk/types";

import type { Bindings } from "../context";
import { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import { CloudflareToolRegistry } from "../nodes/cloudflare-tool-registry";
import {
  Runtime,
  type RuntimeDependencies,
  type RuntimeParams,
} from "./base-runtime";
import { CloudflareCreditService } from "./credit-service";
import { CloudflareCredentialService } from "./credential-service";
import { CloudflareExecutionStore } from "./execution-store";
import { CloudflareMonitoringService } from "./monitoring-service";
import { CloudflareObjectStore } from "./object-store";

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
    const nodeRegistry = new CloudflareNodeRegistry(env, true);

    // eslint-disable-next-line prefer-const -- circular dependency pattern requires let
    let credentialProvider: CloudflareCredentialService;
    const toolRegistry = new CloudflareToolRegistry(
      nodeRegistry,
      (nodeId: string, inputs: Record<string, unknown>) =>
        credentialProvider.createToolContext(nodeId, inputs)
    );
    credentialProvider = new CloudflareCredentialService(env, toolRegistry);

    const dependencies: RuntimeDependencies = {
      nodeRegistry,
      credentialProvider,
      executionStore: new CloudflareExecutionStore(env),
      monitoringService: new CloudflareMonitoringService(
        env.WORKFLOW_SESSION
      ),
      creditService: new CloudflareCreditService(
        env.KV,
        env.CLOUDFLARE_ENV === "development"
      ),
      objectStore: new CloudflareObjectStore(env.RESSOURCES),
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
