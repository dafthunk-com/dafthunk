/**
 * Cloudflare Runtime
 *
 * Production runtime implementation using Cloudflare services.
 * Provides the full feature set including all 50+ node types and integrations.
 *
 * ## Architecture
 *
 * Extends BaseRuntime with injected Cloudflare-specific dependencies:
 * - **CloudflareNodeRegistry**: Complete node catalog (50+ nodes including geotiff, AI, etc.)
 * - **CloudflareToolRegistry**: Full tool support with all providers
 * - **WorkflowSessionMonitoringService**: Real-time updates via Durable Objects
 * - **ExecutionStore**: Persistent storage with D1 + R2
 *
 * ## Usage
 *
 * Exported from `index.ts` as "Runtime" for wrangler production configuration:
 * ```ts
 * // wrangler.jsonc
 * "workflows": [{
 *   "binding": "EXECUTE",
 *   "class_name": "Runtime"
 * }]
 * ```
 *
 * @see {@link BaseRuntime} - Base runtime class
 * @see {@link MockRuntime} - Test implementation
 */

import type { Bindings } from "../context";
import { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import { CloudflareToolRegistry } from "../nodes/cloudflare-tool-registry";
import { WorkflowSessionMonitoringService } from "../services/monitoring-service";
import { ExecutionStore } from "../stores/execution-store";
import { BaseRuntime, type RuntimeDependencies } from "./base-runtime";
import { ResourceProvider } from "./resource-provider";

export class CloudflareRuntime extends BaseRuntime {
  constructor(ctx: ExecutionContext, env: Bindings) {
    // Create production dependencies
    const nodeRegistry = new CloudflareNodeRegistry(env, true);

    // Create tool registry with factory function
    // eslint-disable-next-line prefer-const -- circular dependency pattern requires let
    let resourceProvider: ResourceProvider;
    const toolRegistry = new CloudflareToolRegistry(
      nodeRegistry,
      (nodeId: string, inputs: Record<string, any>) =>
        resourceProvider.createToolContext(nodeId, inputs)
    );

    // Create ResourceProvider with production tool registry
    resourceProvider = new ResourceProvider(env, toolRegistry);

    // Create production-ready dependencies
    const dependencies: RuntimeDependencies = {
      nodeRegistry,
      resourceProvider,
      executionStore: new ExecutionStore(env.DB, env.RESSOURCES),
      monitoringService: new WorkflowSessionMonitoringService(
        env.WORKFLOW_SESSION
      ),
    };

    // Call parent constructor with injected dependencies
    super(ctx, env, dependencies);
  }
}
