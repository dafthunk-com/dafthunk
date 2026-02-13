/**
 * Mock Runtime
 *
 * Runtime implementation with mock dependencies for workflow integration testing.
 * Uses lightweight mocks to avoid external dependencies and heavy packages.
 *
 * ## Architecture
 *
 * Extends WorkflowEntrypoint for test integration with Cloudflare Workflows testing APIs.
 * Uses Runtime for core execution logic via composition.
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
 * @see {@link Runtime} - Base runtime class
 * @see {@link WorkflowRuntime} - Production implementation
 */

import {
  WorkflowEntrypoint,
  WorkflowEvent,
  WorkflowStep,
  WorkflowStepConfig,
} from "cloudflare:workers";
import {
  Runtime,
  type RuntimeDependencies,
  type RuntimeParams,
} from "@dafthunk/runtime";
import type { WorkflowExecution } from "@dafthunk/types";
import type { Bindings } from "../context";
import { CloudflareObjectStore } from "../runtime/cloudflare-object-store";
import { createToolContext } from "../runtime/tool-context";
import { MockCredentialService } from "./credential-service";
import { MockDatabaseService } from "./database-service";
import { MockDatasetService } from "./dataset-service";
import { MockExecutionStore } from "./execution-store";
import { MockMonitoringService } from "./monitoring-service";
import { MockNodeRegistry } from "./node-registry";
import { MockQueueService } from "./queue-service";
import { MockToolRegistry } from "./tool-registry";

/**
 * Mock workflow runtime with step-based execution for testing.
 * Implements the core workflow execution logic with test-friendly dependencies.
 */
class MockWorkflowRuntime extends Runtime<Bindings> {
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
    const objectStore = new CloudflareObjectStore(env.RESSOURCES);
    const toolRegistry = new MockToolRegistry(
      nodeRegistry,
      (nodeId: string, inputs: Record<string, unknown>) =>
        createToolContext(nodeId, inputs, env, objectStore)
    );
    const credentialProvider = new MockCredentialService();
    const databaseService = new MockDatabaseService();
    const datasetService = new MockDatasetService();
    const queueService = new MockQueueService();

    // Create test-friendly dependencies
    const dependencies: RuntimeDependencies<Bindings> = {
      nodeRegistry,
      credentialProvider,
      executionStore: new MockExecutionStore(),
      monitoringService: new MockMonitoringService(),
      creditService: {
        hasEnoughCredits: async () => true,
        recordUsage: async () => {},
      },
      objectStore,
      toolRegistry,
      databaseService,
      datasetService,
      queueService,
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
