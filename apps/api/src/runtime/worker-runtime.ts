/**
 * Worker Runtime
 *
 * Runtime implementation for Cloudflare Workers (without Workflows).
 * Executes workflows synchronously in a single request without durability.
 *
 * ## Architecture
 *
 * Extends Runtime with direct execution (no durable steps):
 * - **CloudflareNodeRegistry**: Complete node catalog (50+ nodes)
 * - **CloudflareToolRegistry**: Full tool support with all providers
 * - **CloudflareMonitoringService**: Real-time updates via Durable Objects
 * - **ExecutionStore**: Persistent storage with D1 + R2
 *
 * ## Usage
 *
 * Use for workflows that:
 * - Complete in under 30 seconds (CPU time limit)
 * - Don't require durable execution or retries
 * - Need lower latency than Workflows
 *
 * @see {@link Runtime} - Abstract runtime class
 * @see {@link CloudflareWorkflowRuntime} - Durable Workflows implementation
 */

import {
  Runtime,
  type RuntimeDependencies,
  type RuntimeParams,
} from "@dafthunk/runtime";
import type { WorkflowExecution } from "@dafthunk/types";
import type { Bindings } from "../context";
import { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import { CloudflareToolRegistry } from "../nodes/cloudflare-tool-registry";
import {
  CloudflareCreditService,
  CloudflareExecutionStore,
  CloudflareMonitoringService,
  CloudflareObjectStore,
  CloudflareParameterMapper,
  CloudflareResourceProvider,
  CloudflareWorkflowValidator,
} from "./adapters";

/**
 * Worker-based runtime with direct execution (no durable steps).
 * Executes workflows synchronously in a single Worker request.
 */
export class WorkerRuntime extends Runtime {
  /**
   * Implements step execution by directly calling the function.
   * No durability or retries - execution is synchronous and ephemeral.
   */
  protected async executeStep<T>(
    _name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    // Direct execution without durability
    return await fn();
  }

  /**
   * Executes a workflow and returns the result.
   * This is the main entry point for Worker-based execution.
   *
   * @param params - Workflow execution parameters
   * @param instanceId - Optional execution ID (generates one if not provided)
   * @returns The workflow execution result
   */
  async execute(
    params: RuntimeParams,
    instanceId?: string
  ): Promise<WorkflowExecution> {
    const executionId = instanceId ?? crypto.randomUUID();
    return await this.run(params, executionId);
  }

  /**
   * Static factory method to create a Worker runtime with production dependencies.
   */
  static create(env: Bindings): WorkerRuntime {
    // Create production dependencies
    const nodeRegistry = new CloudflareNodeRegistry(env, true);

    // Create object store for blob storage
    const objectStore = new CloudflareObjectStore(env.RESSOURCES);

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
      monitoringService: new CloudflareMonitoringService(env.WORKFLOW_SESSION),
      creditService: new CloudflareCreditService(
        env.KV,
        env.CLOUDFLARE_ENV === "development"
      ),
    };

    return new WorkerRuntime(dependencies);
  }
}
