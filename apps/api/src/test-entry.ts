/**
 * Test-Specific Entry Point
 *
 * This entry point exports test-friendly versions of worker classes,
 * avoiding dependency issues from loading the full worker in src/index.ts.
 *
 * Purpose:
 * - Enables Cloudflare Workflows testing with introspectWorkflowInstance API
 * - Avoids loading incompatible dependencies (e.g., geotiff with node:https)
 * - Keeps test environment clean and fast
 *
 * Usage:
 * - Referenced in vitest.config.ts as poolOptions.workers.main
 * - Referenced in wrangler.test.jsonc as workflow class_name
 * - Only used during test execution
 * - Does NOT affect production builds
 *
 * Implementation:
 * - Exports MockRuntime with injected mock dependencies:
 *   - MockNodeRegistry (basic math nodes only, no geotiff)
 *   - MockToolRegistry (simpler tool registry)
 *   - MockMonitoringService (captures updates for verification)
 *   - MockExecutionStore (in-memory storage)
 * - Avoids importing CloudflareNodeRegistry and heavy dependencies
 */

// Export mock runtime for workflow testing
// Note: We export it as "Runtime" so wrangler config can reference it by that name
export { MockRuntime as Runtime } from "./mocks/runtime";

// Export Session for Durable Object testing (if needed in future)
export { Session } from "./session/session";

// Note: We intentionally do NOT import the full index.ts or CloudflareNodeRegistry
// to avoid pulling in dependencies that require Node.js modules not available
// in the Workers runtime (e.g., geotiff importing node:https).
