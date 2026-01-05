import type { Workflow } from "@dafthunk/types";

import type { Bindings } from "../../context";
import { TRIAL_CREDITS } from "../../constants/billing";
import type { BaseRuntime, RuntimeParams } from "../base-runtime";
import { WorkerRuntime } from "../worker-runtime";

/**
 * Helper to create unique instance IDs for test workflows
 */
export const createInstanceId = (testName: string): string =>
  `test-${testName}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

/**
 * Helper to create runtime params for test workflows
 */
export const createParams = (workflow: Workflow): RuntimeParams => ({
  workflow,
  userId: "test-user",
  organizationId: "test-org",
  computeCredits: TRIAL_CREDITS,
});

/**
 * Runtime factory type for creating test runtime instances.
 * Allows testing different runtime implementations with the same specification.
 */
export type RuntimeFactory = (env: Bindings) => BaseRuntime;

/**
 * Helper to create a test runtime instance.
 * Uses CloudflareWorkerRuntime for direct, non-durable execution.
 * This allows testing without depending on the EXECUTE binding or Workflows infrastructure.
 */
export const createTestRuntime = (env: Bindings): BaseRuntime => {
  return WorkerRuntime.create(env);
};

/**
 * Factory for CloudflareWorkerRuntime (direct execution, no durability)
 */
export const createWorkerRuntime: RuntimeFactory = (env: Bindings) => {
  return WorkerRuntime.create(env);
};

/**
 * Adapter to use Cloudflare Workflows EXECUTE binding with the RuntimeFactory pattern.
 * Wraps the workflow execution to provide a BaseRuntime-compatible interface.
 * Reconstructs WorkflowExecution from workflow steps using introspection API.
 */
class WorkflowsRuntimeAdapter {
  constructor(private executeBinding: any) {}

  async run(
    params: RuntimeParams,
    instanceId: string
  ): Promise<import("@dafthunk/types").WorkflowExecution> {
    // Import introspection API (only available in test environment)
    const { introspectWorkflowInstance } = await import("cloudflare:test");

    // Set up workflow introspection BEFORE creating the workflow (as in original tests)
    await using instance = await introspectWorkflowInstance(
      this.executeBinding,
      instanceId
    );

    // Create and execute workflow
    await this.executeBinding.create({
      id: instanceId,
      params,
    });

    // Wait for workflow completion
    await instance.waitForStatus("complete");

    // Reconstruct WorkflowExecution from step results
    const workflow = params.workflow;
    const nodeExecutions: Array<{
      nodeId: string;
      status: string;
      outputs?: any;
      usage: number;
      error?: string;
      [key: string]: any;
    }> = [];

    // Collect results from all node execution steps
    for (const node of workflow.nodes) {
      try {
        const stepName = `run node ${node.id}`;
        const result = await instance.waitForStepResult({ name: stepName });

        // The step result contains the node execution data
        if (result && typeof result === "object") {
          nodeExecutions.push({
            nodeId: node.id,
            ...(result as any),
          });
        }
      } catch (error) {
        // Node may have been skipped or not executed
        // Continue to collect other nodes
      }
    }

    // Determine overall status
    const hasError = nodeExecutions.some((ne) => ne.status === "error");
    const status = hasError ? "error" : "completed";

    return {
      id: instanceId,
      workflowId: workflow.id,
      status: status as any,
      nodeExecutions: nodeExecutions as any,
      startedAt: new Date(),
      endedAt: new Date(),
      usage: nodeExecutions.reduce((sum, ne) => sum + (ne.usage || 0), 0),
    };
  }
}

/**
 * Factory for Workflow Runtime (Workflows-based execution with durability).
 * In test environment, this uses MockRuntime (configured in test-entry.ts).
 * In production, this would use WorkflowRuntime.
 * Tests durable execution with step.do() via EXECUTE binding.
 */
export const createWorkflowRuntime: RuntimeFactory = (env: Bindings) => {
  const executeBinding = (env as any).EXECUTE;
  if (!executeBinding) {
    throw new Error(
      "EXECUTE binding not found. Make sure Workflows are configured in wrangler.test.jsonc"
    );
  }
  return new WorkflowsRuntimeAdapter(executeBinding) as any as BaseRuntime;
};
