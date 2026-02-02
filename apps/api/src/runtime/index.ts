/**
 * Runtime module - Workflow execution engine
 *
 * This module handles the execution of workflows using Cloudflare Workflows.
 * Deep module design: exposes minimal public API while hiding implementation complexity.
 *
 * Public API:
 * - Runtime: Abstract base class for workflow execution with dependency injection
 * - WorkflowRuntime: Durable workflow execution with step-based persistence
 * - WorkflowRuntimeEntrypoint: Cloudflare Workflows entrypoint (durable execution)
 * - RuntimeParams: Configuration type for workflow execution
 * - RuntimeDependencies: Injectable dependencies interface
 *
 * Note: MockRuntime is exported from src/mocks/ instead of here.
 *
 * Everything else is an implementation detail and should not be imported directly.
 */

// Main runtime classes and types
export {
  Runtime,
  type RuntimeDependencies,
  type RuntimeParams,
} from "./base-runtime";
// Credit service for compute usage tracking
export type { CreditCheckParams } from "./credit-service";
export { CreditService } from "./credit-service";
// Runtime implementations
export { WorkflowRuntime } from "./workflow-runtime";
export { WorkflowRuntimeEntrypoint } from "./workflow-runtime-entrypoint";

// Internal components are NOT exported - they are implementation details:
// - ExecutionEngine: node execution, skip logic, input collection
// - ExecutionPersistence: database storage
// - ExecutionMonitoring: real-time updates
// - CredentialService: secrets, integrations, OAuth
// - ErrorHandler: error classification and handling
// - CreditManager: compute credit tracking
// - execution-types.ts: execution state, context, errors, and status computation
// - node-types.ts: node domain model (ExecutableNode, NodeContext, BlobParameter, etc.)
// - parameter-mapper.ts: API ↔ node parameter conversion
// All complexity is pushed down into these deep modules with simple interfaces
