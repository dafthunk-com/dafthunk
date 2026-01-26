/**
 * @dafthunk/runtime - Workflow Execution Engine
 *
 * Platform-agnostic workflow execution runtime with dependency injection.
 * This package provides the core execution logic without any platform-specific code.
 *
 * ## Architecture
 *
 * The runtime uses the Dependency Inversion Principle:
 * - `ports.ts` defines interfaces that the runtime needs
 * - `runtime.ts` implements core execution logic using only interfaces
 * - Platform implementations (Cloudflare, etc.) inject concrete implementations
 *
 * ## Usage
 *
 * ```ts
 * import { Runtime, RuntimeDependencies, RuntimeParams } from '@dafthunk/runtime';
 *
 * class MyRuntime extends Runtime {
 *   protected async executeStep<T>(name: string, fn: () => Promise<T>): Promise<T> {
 *     return await fn();
 *   }
 * }
 *
 * const runtime = new MyRuntime(dependencies);
 * const result = await runtime.run(params, instanceId);
 * ```
 */

// Port interfaces - what the runtime needs
export type {
  BlobParameter,
  CreditCheckParams,
  CreditService,
  EmailMessage,
  ExecutableNode,
  ExecutionRow,
  ExecutionStore,
  HttpRequest,
  IntegrationInfo,
  ListExecutionsOptions,
  MonitoringService,
  NodeContext,
  NodeRegistry,
  ObjectInfo,
  ObjectStore,
  ParameterMapper,
  PresignedUrlConfig,
  ResourceProvider,
  SaveExecutionRecord,
  ToolDefinition,
  ToolReference,
  ToolRegistry,
  ValidationError,
  WorkflowValidator,
} from "./ports";

// Runtime types - execution state and values
export type {
  ExecutableNodeConstructor,
  ExecutionLevel,
  ExecutionState,
  IntegrationData,
  NodeExecutionResult,
  NodeRuntimeValues,
  RuntimeValue,
  SkipReason,
  SkipReasonResult,
  WorkflowExecutionContext,
  WorkflowRuntimeState,
} from "./types";

// Runtime utilities
export {
  applyNodeResult,
  CyclicGraphError,
  getExecutionStatus,
  getNodeType,
  inferSkipReason,
  InsufficientCreditsError,
  isRuntimeValue,
  NodeExecutionError,
  NodeNotFoundError,
  NodeTypeNotImplementedError,
  SubscriptionRequiredError,
  SystemError,
  WorkflowError,
  WorkflowValidationError,
} from "./types";

// Runtime class
export { Runtime } from "./runtime";
export type { RuntimeDependencies, RuntimeParams } from "./runtime";

// Specification tests - platform-agnostic test suite
export {
  createInstanceId,
  createParams,
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
  type RuntimeFactory,
  type TestableRuntime,
} from "./specification";
