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
// - credential-service.ts: secrets, integrations, OAuth
// - monitoring-service.ts: real-time execution updates
// - execution-state.ts: pure functions for state management
// - execution-store.ts: execution persistence (R2 + Analytics Engine)
// - execution-errors.ts: error message formatters
// - execution-types.ts: execution state, context, and type definitions
// - node-types.ts: node domain model (ExecutableNode, NodeContext, BlobParameter)
// - parameter-mapper.ts: API <-> node parameter conversion
// - object-store.ts: R2 storage for binary objects
