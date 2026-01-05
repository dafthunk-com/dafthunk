/**
 * Complete specification test suite for Worker Runtime (direct execution)
 *
 * This file runs all runtime specification tests against the Worker Runtime
 * (CloudflareWorkerRuntime) which uses direct execution without Workflows infrastructure.
 *
 * This is faster than workflow-runtime.test.ts but doesn't test durable execution.
 * Both test files run the same 50 specification tests to ensure consistent behavior.
 */
import { createWorkerRuntime } from "./helpers";

// Import all specification test functions
import { testSuccessfulExecution } from "./successful-execution-spec";
import { testFailingExecution } from "./failing-execution-spec";
import { testEdgeCases } from "./edge-cases-spec";
import { testConcurrentErrors } from "./concurrent-errors-spec";
import { testConditionalBranching } from "./conditional-branching-spec";
import { testInputCollection } from "./input-collection-spec";
import { testMonitoringUpdates } from "./monitoring-updates-spec";
import { testNodeExecutionErrors } from "./node-execution-errors-spec";
import { testOutputHandling } from "./output-handling-spec";
import { testSkipLogic } from "./skip-logic-spec";
import { testStateConsistency } from "./state-consistency-spec";
import { testStatusComputation } from "./status-computation-spec";
import { testTopologicalOrdering } from "./topological-ordering-spec";
import { testWorkflowValidation } from "./workflow-validation-spec";

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
