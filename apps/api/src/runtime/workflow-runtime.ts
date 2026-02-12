/**
 * Workflow Runtime
 *
 * Re-exports WorkflowRuntime from @dafthunk/runtime and provides a Cloudflare-specific
 * factory function that wires production dependencies.
 *
 * @see {@link WorkflowRuntime} - Base runtime class
 * @see {@link createWorkflowRuntime} - Factory for Cloudflare Workers
 */

import {
  WorkflowRuntime,
  type RuntimeDependencies,
} from "@dafthunk/runtime";

import type { Bindings } from "../context";
import { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import { CloudflareToolRegistry } from "../nodes/cloudflare-tool-registry";
import { CloudflareCredentialService } from "./credential-service";
import { CloudflareCreditService } from "./credit-service";
import { CloudflareDatabaseService } from "./database-service";
import { CloudflareExecutionStore } from "./execution-store";
import { CloudflareMonitoringService } from "./monitoring-service";
import { CloudflareObjectStore } from "./object-store";

export { WorkflowRuntime } from "@dafthunk/runtime";

/**
 * Creates a WorkflowRuntime with Cloudflare production dependencies.
 */
export function createWorkflowRuntime(env: Bindings): WorkflowRuntime<Bindings> {
  const nodeRegistry = new CloudflareNodeRegistry(env, true);

  // eslint-disable-next-line prefer-const -- circular dependency pattern requires let
  let credentialProvider: CloudflareCredentialService;
  const toolRegistry = new CloudflareToolRegistry(
    nodeRegistry,
    (nodeId: string, inputs: Record<string, unknown>) =>
      credentialProvider.createToolContext(nodeId, inputs)
  );
  const databaseService = new CloudflareDatabaseService(env);
  credentialProvider = new CloudflareCredentialService(env, toolRegistry, databaseService);

  const dependencies: RuntimeDependencies<Bindings> = {
    nodeRegistry,
    credentialProvider,
    executionStore: new CloudflareExecutionStore(env),
    monitoringService: new CloudflareMonitoringService(env.WORKFLOW_SESSION),
    creditService: new CloudflareCreditService(
      env.KV,
      env.CLOUDFLARE_ENV === "development"
    ),
    objectStore: new CloudflareObjectStore(env.RESSOURCES),
    databaseService,
  };

  return new WorkflowRuntime(env, dependencies);
}
