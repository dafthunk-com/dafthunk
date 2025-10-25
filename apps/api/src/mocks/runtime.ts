/**
 * Mock Runtime
 *
 * Runtime implementation with mock dependencies for workflow integration testing.
 * Uses lightweight mocks to avoid external dependencies and heavy packages.
 *
 * ## Architecture
 *
 * Extends BaseRuntime with injected mock dependencies:
 * - **MockNodeRegistry**: Basic math nodes only (no heavy dependencies like geotiff)
 * - **MockToolRegistry**: Simplified tool registry for testing
 * - **MockMonitoringService**: In-memory monitoring for verification
 * - **MockExecutionStore**: In-memory storage (no database required)
 *
 * ## Usage
 *
 * Exported from `test-entry.ts` as "Runtime" for wrangler test configuration:
 * ```ts
 * // vitest.config.ts
 * poolOptions: {
 *   workers: {
 *     main: "./src/test-entry.ts"
 *   }
 * }
 * ```
 *
 * @see {@link BaseRuntime} - Base runtime class
 * @see {@link CloudflareRuntime} - Production implementation
 */

import type { Bindings } from "../context";
import { BaseRuntime, type RuntimeDependencies } from "../runtime/base-runtime";
import { ResourceProvider } from "../runtime/resource-provider";
import { MockExecutionStore } from "./execution-store";
import { MockMonitoringService } from "./monitoring-service";
import { MockNodeRegistry } from "./node-registry";
import { MockToolRegistry } from "./tool-registry";

export class MockRuntime extends BaseRuntime {
  constructor(ctx: ExecutionContext, env: Bindings) {
    // Create mock dependencies
    const nodeRegistry = new MockNodeRegistry(env, true);

    // Create tool registry with factory function
    // eslint-disable-next-line prefer-const -- circular dependency pattern requires let
    let resourceProvider: ResourceProvider;
    const toolRegistry = new MockToolRegistry(
      nodeRegistry,
      (nodeId: string, inputs: Record<string, any>) =>
        resourceProvider.createToolContext(nodeId, inputs)
    );

    // Create ResourceProvider with test tool registry
    resourceProvider = new ResourceProvider(env, toolRegistry);

    // Create test-friendly dependencies
    const dependencies: RuntimeDependencies = {
      nodeRegistry,
      resourceProvider,
      executionStore: new MockExecutionStore() as any,
      monitoringService: new MockMonitoringService(),
    };

    // Call parent constructor with injected dependencies
    super(ctx, env, dependencies);
  }
}
