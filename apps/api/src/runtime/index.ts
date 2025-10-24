/**
 * Runtime module - Workflow execution engine
 *
 * This module handles the execution of workflows using Cloudflare Workflows.
 * Deep module design: exposes minimal public API while hiding implementation complexity.
 *
 * Public API:
 * - Runtime: Main workflow execution entrypoint
 * - RuntimeParams: Configuration for workflow execution
 * - Types: Core data structures for workflow execution
 * - Utilities: Status computation and input collection
 */

// Main runtime class and parameters (only public API for workflow execution)
export type { RuntimeParams } from "./runtime";
export { Runtime } from "./runtime";

// Utilities
export { getExecutionStatus } from "./status-utils";

// Essential types used by external modules
export type {
  ExecutionPlan,
  ExecutionState,
  ExecutionUnit,
  IndividualNode,
  InlineGroup,
  IntegrationData,
  NodeRuntimeValues,
  RuntimeValue,
  WorkflowExecutionContext,
  WorkflowRuntimeState,
} from "./types";
export {
  getNodeType,
  isRuntimeValue,
  // Error types
  WorkflowError,
  WorkflowValidationError,
  CyclicGraphError,
  NodeExecutionError,
  NodeNotFoundError,
  NodeTypeNotImplementedError,
  SystemError,
  InsufficientCreditsError,
} from "./types";

// Internal components are NOT exported - they are implementation details:
// - ExecutionEngine: combines NodeExecutor, InputCollector, InputTransformer, OutputTransformer
// - ResourceProvider: combines SecretManager, IntegrationManager
// - ErrorHandler, SkipHandler, CreditManager, etc.: supporting utilities
// All complexity is pushed down into these deep modules with simple interfaces
