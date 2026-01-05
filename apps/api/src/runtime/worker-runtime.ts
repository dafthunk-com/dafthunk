/**
 * Worker Runtime
 *
 * Runtime implementation for Cloudflare Workers (without Workflows).
 * Executes workflows synchronously in a single request without durability.
 *
 * ## Architecture
 *
 * Extends BaseRuntime with direct execution (no durable steps):
 * - **CloudflareNodeRegistry**: Complete node catalog (50+ nodes)
 * - **CloudflareToolRegistry**: Full tool support with all providers
 * - **WorkflowSessionMonitoringService**: Real-time updates via Durable Objects
 * - **ExecutionStore**: Persistent storage with D1 + R2
 *
 * ## Usage
 *
 * Use for workflows that:
 * - Complete in under 30 seconds (CPU time limit)
 * - Don't require durable execution or retries
 * - Need lower latency than Workflows
 *
 * @see {@link BaseRuntime} - Base runtime class
 * @see {@link CloudflareWorkflowRuntime} - Durable Workflows implementation
 */

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
 * Worker-based runtime with direct execution (no durable steps).
 * Executes workflows synchronously in a single Worker request.
 */
export class CloudflareWorkerRuntime extends BaseRuntime {
  /**
   * Implements step execution by directly calling the function.
   * No durability or retries - execution is synchronous and ephemeral.
   */
  protected async executeStep<T>(
    name: string,
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
  static create(env: Bindings): CloudflareWorkerRuntime {
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

    return new CloudflareWorkerRuntime(env, dependencies);
  }
}
