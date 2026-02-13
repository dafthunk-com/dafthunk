/**
 * Worker Runtime
 *
 * Runtime implementation for Cloudflare Workers (without Workflows).
 * Executes workflows synchronously in a single request without durability.
 *
 * ## Architecture
 *
 * Extends Runtime with direct execution (no durable steps).
 * Factory methods for wiring app-specific dependencies live in the consumer app.
 *
 * ## Usage
 *
 * Use for workflows that:
 * - Complete in under 30 seconds (CPU time limit)
 * - Don't require durable execution or retries
 * - Need lower latency than Workflows
 *
 * @see {@link Runtime} - Base runtime class
 */

import type { WorkflowExecution } from "@dafthunk/types";

import { Runtime, type RuntimeParams } from "./base-runtime";

/**
 * Worker-based runtime with direct execution (no durable steps).
 * Executes workflows synchronously in a single Worker request.
 */
export class WorkerRuntime<Env = unknown> extends Runtime<Env> {
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
}
