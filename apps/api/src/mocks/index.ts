/**
 * Mock Implementations for Testing
 *
 * This module provides mock implementations of core services, stores, registries,
 * and runtime for use in tests. These mocks avoid external dependencies (databases,
 * Durable Objects, heavy packages like geotiff) and provide lightweight, in-memory
 * implementations with inspection capabilities.
 *
 * ## Available Mocks
 *
 * - **MockRuntime**: Complete runtime with all mock dependencies for workflow testing
 * - **MockNodeRegistry**: Lightweight node registry with basic math nodes only
 * - **MockToolRegistry**: Simplified tool registry for test workflows
 * - **MockExecutionStore**: In-memory execution storage (no database)
 * - **MockMonitoringService**: In-memory monitoring with captured updates
 *
 * ## Usage
 *
 * ```ts
 * import {
 *   MockRuntime,
 *   MockNodeRegistry,
 *   MockToolRegistry,
 *   MockExecutionStore,
 *   MockMonitoringService
 * } from './mocks';
 * ```
 */

// Mock adapters (implementations of @dafthunk/runtime interfaces)
export {
  MockCreditService,
  MockExecutionStore,
  MockMonitoringService,
  MockObjectStore,
  MockParameterMapper,
  MockResourceProvider,
  MockWorkflowValidator,
} from "./adapters";

// Mock registries (mirror nodes/ structure)
export { MockNodeRegistry } from "./node-registry";
// Mock runtime
export { MockRuntime } from "./runtime";
export { MockToolRegistry } from "./tool-registry";
