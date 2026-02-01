/**
 * Runtime module - Workflow execution engine
 *
 * This module handles the execution of workflows using Cloudflare Workflows.
 * Deep module design: exposes minimal public API while hiding implementation complexity.
 *
 * ## Architecture
 *
 * Core runtime logic lives in @dafthunk/runtime package (platform-agnostic).
 * This module provides Cloudflare-specific implementations and adapters.
 *
 * Public API:
 * - From @dafthunk/runtime: Runtime, RuntimeParams, RuntimeDependencies, ports
 * - Cloudflare adapters: All implementations in runtime/adapters/
 * - Cloudflare entrypoint: WorkflowRuntimeEntrypoint
 *
 * Note: MockRuntime is exported from src/mocks/ instead of here.
 */

// Re-export everything from the runtime package
export * from "@dafthunk/runtime";
export type { ResourceProvider } from "./adapters";
// Cloudflare-specific adapters (all implementations of @dafthunk/runtime interfaces)
export {
  CloudflareCreditService,
  CloudflareExecutionStore,
  CloudflareMonitoringService,
  CloudflareObjectStore,
  CloudflareParameterMapper,
  CloudflareResourceProvider,
  CloudflareWorkflowValidator,
} from "./adapters";

// Cloudflare runtime implementations
export { WorkerRuntime } from "./worker-runtime";
export { WorkflowRuntime } from "./workflow-runtime";
export { WorkflowRuntimeEntrypoint } from "./workflow-runtime-entrypoint";
