/**
 * Runtime module - Workflow execution engine
 *
 * This module handles the execution of workflows using Cloudflare Workflows.
 * Deep module design: exposes minimal public API while hiding implementation complexity.
 *
 * Public API:
 * - BaseRuntime: Base workflow execution class with dependency injection
 * - WorkflowRuntimeEntrypoint: Cloudflare Workflows entrypoint (durable execution)
 * - RuntimeParams: Configuration type for workflow execution
 * - RuntimeDependencies: Injectable dependencies interface
 *
 * Note: MockRuntime is exported from src/mocks/ instead of here.
 *
 * Everything else is an implementation detail and should not be imported directly.
 */

// Main runtime classes and types
export type { RuntimeDependencies, RuntimeParams } from "./base-runtime";
export { BaseRuntime } from "./base-runtime";
// Credit service interface for dependency injection
export type { CreditCheckParams, CreditService } from "./credit-service";
export { KVCreditService } from "./credit-service";
export { WorkflowRuntimeEntrypoint } from "./workflow-runtime-entrypoint";

// Internal components are NOT exported - they are implementation details:
// - ExecutionEngine: node execution, skip logic, input collection
// - ExecutionPersistence: database storage
// - ExecutionMonitoring: real-time updates
// - ResourceProvider: secrets, integrations, OAuth
// - ErrorHandler: error classification and handling
// - CreditManager: compute credit tracking
// - types.ts: internal type definitions
// All complexity is pushed down into these deep modules with simple interfaces
