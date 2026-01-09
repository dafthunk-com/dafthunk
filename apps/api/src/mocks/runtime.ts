/**
 * Mock Runtime
 *
 * Runtime implementation with mock dependencies for workflow integration testing.
 * Uses lightweight mocks to avoid external dependencies and heavy packages.
 *
 * ## Architecture
 *
 * Extends WorkflowEntrypoint for test integration with Cloudflare Workflows testing APIs.
 * Uses BaseRuntime for core execution logic via composition.
 *
 * - **MockNodeRegistry**: Basic math nodes only (no heavy dependencies like geotiff)
 * - **MockToolRegistry**: Simplified tool registry for testing
 * - **MockMonitoringService**: In-memory monitoring for verification
 * - **MockExecutionStore**: In-memory storage (no database required)
 *
 * ## Usage
 *
 * Exported from `test-entry.ts` as "Runtime" for wrangler test configuration:
 * ```ts
 * // vitest.config.ts
 * poolOptions: {
 *   workers: {
 *     main: "./src/test-entry.ts"
 *   }
 * }
 * ```
 *
 * @see {@link BaseRuntime} - Base runtime class
 * @see {@link WorkflowRuntime} - Production implementation
 */

import {
  WorkflowEntrypoint,
  WorkflowEvent,
  WorkflowStep,
  WorkflowStepConfig,
} from "cloudflare:workers";
import type { WorkflowExecution } from "@dafthunk/types";

import type { Bindings } from "../context";
import {
  BaseRuntime,
  type RuntimeDependencies,
  type RuntimeParams,
} from "../runtime/base-runtime";
import { MockExecutionStore } from "./execution-store";
import { MockMonitoringService } from "./monitoring-service";
import { MockNodeRegistry } from "./node-registry";
import { MockResourceProvider } from "./resource-provider";
import { MockToolRegistry } from "./tool-registry";

/**
 * Mock workflow runtime with step-based execution for testing.
 * Implements the core workflow execution logic with test-friendly dependencies.
 */
class MockWorkflowRuntime extends BaseRuntime {
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
      MockWorkflowRuntime.defaultStepConfig,
      // @ts-expect-error - TS2345: Cloudflare Workflows requires Serializable types
      fn
    )) as T;
  }
}

/**
 * Mock workflow entrypoint for testing.
 * Adapter that connects test infrastructure to the mock runtime.
 */
class MockWorkflowEntrypoint extends WorkflowEntrypoint<
  Bindings,
  RuntimeParams
> {
  private runtime: MockWorkflowRuntime;

  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);

    // Create mock dependencies
    const nodeRegistry = new MockNodeRegistry(env, true);

    // Create tool registry with factory function
    // eslint-disable-next-line prefer-const -- circular dependency pattern requires let
    let resourceProvider: MockResourceProvider;
    const toolRegistry: any = new MockToolRegistry(
      nodeRegistry,
      (nodeId: string, inputs: Record<string, any>) =>
        resourceProvider.createToolContext(nodeId, inputs)
    );

    // Create MockResourceProvider with test tool registry (no database access)
    resourceProvider = new MockResourceProvider(env, toolRegistry);

    // Create test-friendly dependencies
    const dependencies: RuntimeDependencies = {
      nodeRegistry,
      resourceProvider: resourceProvider as any,
      executionStore: new MockExecutionStore() as any,
      monitoringService: new MockMonitoringService(),
    };

    // Create runtime with dependencies
    this.runtime = new MockWorkflowRuntime(env, dependencies);
  }

  /**
   * Workflow entrypoint called by test infrastructure.
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

/**
 * Export as MockRuntime for backward compatibility.
 * This is the class name referenced in test configuration.
 */
export const MockRuntime = MockWorkflowEntrypoint;
