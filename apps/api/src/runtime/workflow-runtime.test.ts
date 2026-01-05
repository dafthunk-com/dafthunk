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
import type { Bindings } from "../context";
import type { BaseRuntime, RuntimeParams } from "./base-runtime";
import type { RuntimeFactory } from "./specification/helpers";

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
const createWorkflowRuntime: RuntimeFactory = (env: Bindings): BaseRuntime => {
  const executeBinding = (env as any).EXECUTE;
  if (!executeBinding) {
    throw new Error(
      "EXECUTE binding not found. Make sure Workflows are configured in wrangler.test.jsonc"
    );
  }
  return new WorkflowsRuntimeAdapter(executeBinding) as any as BaseRuntime;
};

// Import all specification test functions
import { testConcurrentErrors } from "./specification/concurrent-errors-spec";
import { testConditionalBranching } from "./specification/conditional-branching-spec";
import { testEdgeCases } from "./specification/edge-cases-spec";
import { testFailingExecution } from "./specification/failing-execution-spec";
import { testInputCollection } from "./specification/input-collection-spec";
import { testMonitoringUpdates } from "./specification/monitoring-updates-spec";
import { testNodeExecutionErrors } from "./specification/node-execution-errors-spec";
import { testOutputHandling } from "./specification/output-handling-spec";
import { testSkipLogic } from "./specification/skip-logic-spec";
import { testStateConsistency } from "./specification/state-consistency-spec";
import { testStatusComputation } from "./specification/status-computation-spec";
import { testSuccessfulExecution } from "./specification/successful-execution-spec";
import { testTopologicalOrdering } from "./specification/topological-ordering-spec";
import { testWorkflowValidation } from "./specification/workflow-validation-spec";

// Run all specifications against Workflow Runtime
const runtimeName = "WorkflowRuntime";
const factory = createWorkflowRuntime;

testSuccessfulExecution(runtimeName, factory);
testFailingExecution(runtimeName, factory);
testEdgeCases(runtimeName, factory);
testConcurrentErrors(runtimeName, factory);
testConditionalBranching(runtimeName, factory);
testInputCollection(runtimeName, factory);
testMonitoringUpdates(runtimeName, factory);
testNodeExecutionErrors(runtimeName, factory);
testOutputHandling(runtimeName, factory);
testSkipLogic(runtimeName, factory);
testStateConsistency(runtimeName, factory);
testStatusComputation(runtimeName, factory);
testTopologicalOrdering(runtimeName, factory);
testWorkflowValidation(runtimeName, factory);
