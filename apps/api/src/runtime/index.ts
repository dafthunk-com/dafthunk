/**
 * Runtime module - Workflow execution engine
 *
 * This module handles the execution of workflows using Cloudflare Workflows.
 * Deep module design: exposes minimal public API while hiding implementation complexity.
 *
 * Public API:
 * - Runtime: Main workflow execution class (the only thing most code needs)
 * - RuntimeParams: Configuration type for workflow execution
 *
 * Everything else is an implementation detail and should not be imported directly.
 */

// Main runtime class and parameters - this is all you need!
export type { RuntimeParams } from "./runtime";
export { Runtime } from "./runtime";

// Internal components are NOT exported - they are implementation details:
// - ExecutionEngine: node execution, skip logic, input collection
// - ExecutionPersistence: database storage
// - ExecutionMonitoring: real-time updates
// - ResourceProvider: secrets, integrations, OAuth
// - ErrorHandler: error classification and handling
// - CreditManager: compute credit tracking
// - types.ts: internal type definitions
// All complexity is pushed down into these deep modules with simple interfaces
