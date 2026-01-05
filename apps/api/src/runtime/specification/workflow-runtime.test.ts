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
import { createWorkflowRuntime } from "./helpers";

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
