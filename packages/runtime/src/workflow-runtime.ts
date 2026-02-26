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
 * Factory methods for wiring app-specific dependencies live in the consumer app.
 *
 * @see {@link Runtime} - Base runtime class
 */

import type { WorkflowStep, WorkflowStepConfig } from "cloudflare:workers";
import type { WorkflowExecution } from "@dafthunk/types";

import { Runtime, type RuntimeParams } from "./base-runtime";

/**
 * Workflow runtime with step-based execution.
 * Implements the core workflow execution logic with durable steps.
 */
export class WorkflowRuntime<Env = unknown> extends Runtime<Env> {
  protected override readonly supportsAsync = true;
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

  protected async executeSleep(
    name: string,
    durationMs: number
  ): Promise<void> {
    if (!this.currentStep) {
      throw new Error("executeSleep called without workflow step context");
    }
    const seconds = Math.max(1, Math.ceil(durationMs / 1000));
    await this.currentStep.sleep(name, `${seconds} seconds`);
  }

  protected async executeSubStep<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    if (!this.currentStep) {
      throw new Error("executeSubStep called without workflow step context");
    }
    return (await this.currentStep.do(
      name,
      WorkflowRuntime.defaultStepConfig,
      // @ts-expect-error - TS2345: Cloudflare Workflows requires Serializable types
      fn
    )) as T;
  }

  /**
   * Implements async node waiting using Cloudflare Workflows step.waitForEvent().
   * Parks the workflow with zero compute cost until the event arrives.
   */
  protected async waitForNodeEvent<T>(
    name: string,
    eventType: string,
    timeout: string
  ): Promise<T> {
    if (!this.currentStep) {
      throw new Error("waitForNodeEvent called without workflow step context");
    }
    // @ts-expect-error - TS2344: Cloudflare Workflows requires Serializable<T> constraint
    const event = await this.currentStep.waitForEvent<T>(name, {
      type: eventType,
      timeout,
    });
    return event.payload as T;
  }
}
