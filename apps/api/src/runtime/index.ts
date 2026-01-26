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
 * - Cloudflare implementations: WorkflowRuntime, WorkerRuntime, CloudflareCreditService
 * - Cloudflare entrypoint: WorkflowRuntimeEntrypoint
 *
 * Note: MockRuntime is exported from src/mocks/ instead of here.
 */

// Re-export everything from the runtime package
export * from "@dafthunk/runtime";

// Cloudflare-specific adapters
export {
  CloudflareParameterMapper,
  CloudflareWorkflowValidator,
} from "./cloudflare-adapters";

// Cloudflare credit service
export { CloudflareCreditService } from "./credit-service";

// Cloudflare resource provider
export { CloudflareResourceProvider } from "./resource-provider";

// Cloudflare runtime implementations
export { WorkerRuntime } from "./worker-runtime";
export { WorkflowRuntime } from "./workflow-runtime";
export { WorkflowRuntimeEntrypoint } from "./workflow-runtime-entrypoint";
