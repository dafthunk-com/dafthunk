/**
 * Complete specification test suite for Workflow Runtime (Workflows-based execution)
 *
 * This file runs all runtime specification tests against Workflows-based runtimes
 * (WorkflowRuntime in production, MockRuntime in test environment).
 *
 * These runtimes use WorkflowEntrypoint with durable execution via step.do(),
 * as opposed to worker-runtime.test.ts which tests direct Worker execution.
 *
 * In test environment: Uses MockRuntime (configured in test-entry.ts) with
 * lightweight test dependencies (MockNodeRegistry, MockToolRegistry, etc.)
 *
 * In production: Uses WorkflowRuntime with full node catalog and integrations.
 */
import { env } from "cloudflare:test";
import type { RuntimeParams } from "@dafthunk/runtime";
import {
  type RuntimeFactory,
  testConcurrentErrors,
  testConditionalBranching,
  testEdgeCases,
  testFailingExecution,
  testInputCollection,
  testMonitoringUpdates,
  testNodeExecutionErrors,
  testOutputHandling,
  testParallelExecution,
  testSkipLogic,
  testStateConsistency,
  testStatusComputation,
  testSuccessfulExecution,
  testTopologicalOrdering,
  testWorkflowValidation,
} from "@dafthunk/runtime";
import type { Bindings } from "../context";

/**
 * Adapter to use Cloudflare Workflows EXECUTE binding with the RuntimeFactory pattern.
 * Wraps the workflow execution to provide a Runtime-compatible interface.
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
      } catch (_error) {
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
const factory: RuntimeFactory = () => {
  const executeBinding = (env as any as Bindings).EXECUTE;
  if (!executeBinding) {
    throw new Error(
      "EXECUTE binding not found. Make sure Workflows are configured in wrangler.test.jsonc"
    );
  }
  return new WorkflowsRuntimeAdapter(executeBinding) as any;
};

// Run all specifications against Workflow Runtime
const runtimeName = "WorkflowRuntime";

testSuccessfulExecution(runtimeName, factory);
testFailingExecution(runtimeName, factory);
testEdgeCases(runtimeName, factory);
testConcurrentErrors(runtimeName, factory);
testConditionalBranching(runtimeName, factory);
testInputCollection(runtimeName, factory);
testMonitoringUpdates(runtimeName, factory);
testNodeExecutionErrors(runtimeName, factory);
testOutputHandling(runtimeName, factory);
testParallelExecution(runtimeName, factory);
testSkipLogic(runtimeName, factory);
testStateConsistency(runtimeName, factory);
testStatusComputation(runtimeName, factory);
testTopologicalOrdering(runtimeName, factory);
testWorkflowValidation(runtimeName, factory);
// Note: testMultiStepExecution is not included here because the WorkflowsRuntimeAdapter
// reconstructs results from step introspection (waitForStepResult("run node <id>")),
// which doesn't work for multi-step nodes — they manage their own sub-steps instead of
// being wrapped in a single "run node" step. Multi-step behavior is validated by the
// WorkerRuntime tests which use the actual runtime directly.
