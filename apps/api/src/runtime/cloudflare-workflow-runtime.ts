/**
 * Workflow Runtime
 *
 * Re-exports WorkflowRuntime from @dafthunk/runtime and provides a Cloudflare-specific
 * factory function that wires production dependencies.
 *
 * @see {@link WorkflowRuntime} - Base runtime class
 * @see {@link createWorkflowRuntime} - Factory for Cloudflare Workers
 */

import { type RuntimeDependencies, WorkflowRuntime } from "@dafthunk/runtime";

import type { Bindings } from "../context";
import { CloudflareCredentialService } from "./cloudflare-credential-service";
import { CloudflareCreditService } from "./cloudflare-credit-service";
import { CloudflareDatabaseService } from "./cloudflare-database-service";
import { CloudflareDatasetService } from "./cloudflare-dataset-service";
import { CloudflareExecutionStore } from "./cloudflare-execution-store";
import { CloudflareMonitoringService } from "./cloudflare-monitoring-service";
import { CloudflareNodeRegistry } from "./cloudflare-node-registry";
import { CloudflareObjectStore } from "./cloudflare-object-store";
import { CloudflareQueueService } from "./cloudflare-queue-service";
import { CloudflareToolRegistry } from "./cloudflare-tool-registry";

export { WorkflowRuntime } from "@dafthunk/runtime";

/**
 * Creates a WorkflowRuntime with Cloudflare production dependencies.
 */
export function createWorkflowRuntime(
  env: Bindings
): WorkflowRuntime<Bindings> {
  const nodeRegistry = new CloudflareNodeRegistry(env, true);

  // eslint-disable-next-line prefer-const -- circular dependency pattern requires let
  let credentialProvider: CloudflareCredentialService;
  const toolRegistry = new CloudflareToolRegistry(
    nodeRegistry,
    (nodeId: string, inputs: Record<string, unknown>) =>
      credentialProvider.createToolContext(nodeId, inputs)
  );
  const databaseService = new CloudflareDatabaseService(env);
  const datasetService = new CloudflareDatasetService(env);
  const queueService = new CloudflareQueueService(env);
  credentialProvider = new CloudflareCredentialService(
    env,
    toolRegistry,
    databaseService,
    datasetService,
    queueService
  );

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
    datasetService,
    queueService,
  };

  return new WorkflowRuntime(env, dependencies);
}
