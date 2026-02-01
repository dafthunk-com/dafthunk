/**
 * Complete specification test suite for Worker Runtime (direct execution)
 *
 * This file runs all runtime specification tests against the Worker Runtime
 * (CloudflareWorkerRuntime) which uses direct execution without Workflows infrastructure.
 *
 * This is faster than workflow-runtime.test.ts but doesn't test durable execution.
 * Both test files run the same 50 specification tests to ensure consistent behavior.
 */
import { env } from "cloudflare:test";

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
import { WorkerRuntime } from "./worker-runtime";

/**
 * Factory for CloudflareWorkerRuntime (direct execution, no durability).
 * Captures the Cloudflare test environment in a closure.
 */
const createWorkerRuntime: RuntimeFactory = () => {
  return WorkerRuntime.create(env as Bindings);
};

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
testParallelExecution(runtimeName, factory);
testSkipLogic(runtimeName, factory);
testStateConsistency(runtimeName, factory);
testStatusComputation(runtimeName, factory);
testTopologicalOrdering(runtimeName, factory);
testWorkflowValidation(runtimeName, factory);
