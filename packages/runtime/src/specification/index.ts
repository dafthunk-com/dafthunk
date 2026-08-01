/**
 * Runtime specification suite.
 *
 * A reusable, runtime-agnostic description of what *any* Runtime implementation
 * must do. Consumers point these at a factory for their concrete runtime
 * (WorkerRuntime, WorkflowRuntime, a mock) and get the same behavioural
 * contract enforced against all of them.
 *
 * Published under the `@dafthunk/runtime/specification` subpath rather than the
 * package root so test-only helpers never reach a production bundle.
 */

export { testConcurrentErrors } from "./concurrent-errors-spec";
export { testConditionalBranching } from "./conditional-branching-spec";
export { testEdgeCases } from "./edge-cases-spec";
export { testFailingExecution } from "./failing-execution-spec";
export {
  createInstanceId,
  createParams,
  type RuntimeFactory,
} from "./helpers";
export { testInputCollection } from "./input-collection-spec";
export { testMonitoringUpdates } from "./monitoring-updates-spec";
export { testMultiStepExecution } from "./multi-step-execution-spec";
export {
  FailingMultiStepNode,
  MultiStepAdditionNode,
} from "./multi-step-test-nodes";
export { testNodeExecutionErrors } from "./node-execution-errors-spec";
export { testOutputHandling } from "./output-handling-spec";
export { testParallelExecution } from "./parallel-execution-spec";
export { testSkipLogic } from "./skip-logic-spec";
export { testStateConsistency } from "./state-consistency-spec";
export { testStatusComputation } from "./status-computation-spec";
export { testSuccessfulExecution } from "./successful-execution-spec";
export { testTopologicalOrdering } from "./topological-ordering-spec";
export { testWorkflowValidation } from "./workflow-validation-spec";
