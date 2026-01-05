/**
 * Complete specification test suite for Worker Runtime (direct execution)
 *
 * This file runs all runtime specification tests against the Worker Runtime
 * (CloudflareWorkerRuntime) which uses direct execution without Workflows infrastructure.
 *
 * This is faster than workflow-runtime.test.ts but doesn't test durable execution.
 * Both test files run the same 50 specification tests to ensure consistent behavior.
 */
import type { Bindings } from "../context";
import type { BaseRuntime } from "./base-runtime";
import type { RuntimeFactory } from "./specification/helpers";
import { WorkerRuntime } from "./worker-runtime";

/**
 * Factory for CloudflareWorkerRuntime (direct execution, no durability)
 */
const createWorkerRuntime: RuntimeFactory = (env: Bindings): BaseRuntime => {
  return WorkerRuntime.create(env);
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

// Run all specifications against Worker Runtime
const runtimeName = "WorkerRuntime";
const factory = createWorkerRuntime;

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
