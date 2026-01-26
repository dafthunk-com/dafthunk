/**
 * Runtime Specification Tests
 *
 * Platform-agnostic specification tests for workflow execution.
 * These tests verify that any Runtime implementation correctly
 * executes workflows according to the specification.
 *
 * ## Usage
 *
 * ```ts
 * import { testSuccessfulExecution, type RuntimeFactory } from '@dafthunk/runtime/specification';
 *
 * const createMyRuntime: RuntimeFactory = () => new MyRuntime(dependencies);
 *
 * testSuccessfulExecution("MyRuntime", createMyRuntime);
 * ```
 */

// Helpers and types
export {
  createInstanceId,
  createParams,
  type RuntimeFactory,
  type TestableRuntime,
} from "./helpers";

// Specification tests
export { testConcurrentErrors } from "./concurrent-errors-spec";
export { testConditionalBranching } from "./conditional-branching-spec";
export { testEdgeCases } from "./edge-cases-spec";
export { testFailingExecution } from "./failing-execution-spec";
export { testInputCollection } from "./input-collection-spec";
export { testMonitoringUpdates } from "./monitoring-updates-spec";
export { testNodeExecutionErrors } from "./node-execution-errors-spec";
export { testOutputHandling } from "./output-handling-spec";
export { testParallelExecution } from "./parallel-execution-spec";
export { testSkipLogic } from "./skip-logic-spec";
export { testStateConsistency } from "./state-consistency-spec";
export { testStatusComputation } from "./status-computation-spec";
export { testSuccessfulExecution } from "./successful-execution-spec";
export { testTopologicalOrdering } from "./topological-ordering-spec";
export { testWorkflowValidation } from "./workflow-validation-spec";
