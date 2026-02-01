/**
 * Runtime module - Workflow execution engine
 *
 * This module handles the execution of workflows using Cloudflare Workflows.
 * Deep module design: exposes minimal public API while hiding implementation complexity.
 *
 * Public API:
 * - Runtime: Common interface for workflow runtime implementations
 * - BaseRuntime: Base workflow execution class with dependency injection
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
export type { RuntimeDependencies, RuntimeParams } from "./base-runtime";
export { BaseRuntime } from "./base-runtime";
// Credit service for compute usage tracking
export type { CreditCheckParams } from "./credit-service";
export { CreditService } from "./credit-service";
// Runtime interface and implementations
export type { Runtime } from "./types";
export { WorkflowRuntime } from "./workflow-runtime";
export { WorkflowRuntimeEntrypoint } from "./workflow-runtime-entrypoint";

// Internal components are NOT exported - they are implementation details:
// - ExecutionEngine: node execution, skip logic, input collection
// - ExecutionPersistence: database storage
// - ExecutionMonitoring: real-time updates
// - CredentialService: secrets, integrations, OAuth
// - ErrorHandler: error classification and handling
// - CreditManager: compute credit tracking
// - types.ts: internal type definitions
// All complexity is pushed down into these deep modules with simple interfaces
