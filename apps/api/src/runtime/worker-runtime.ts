/**
 * Worker Runtime
 *
 * Re-exports WorkerRuntime from @dafthunk/runtime and provides a Cloudflare-specific
 * factory function that wires production dependencies.
 *
 * @see {@link WorkerRuntime} - Base runtime class
 * @see {@link createWorkerRuntime} - Factory for Cloudflare Workers
 */

import { type RuntimeDependencies, WorkerRuntime } from "@dafthunk/runtime";

import type { Bindings } from "../context";
import { CloudflareNodeRegistry } from "./cloudflare-node-registry";
import { CloudflareToolRegistry } from "./cloudflare-tool-registry";
import { CloudflareCredentialService } from "./credential-service";
import { CloudflareCreditService } from "./credit-service";
import { CloudflareDatabaseService } from "./database-service";
import { CloudflareDatasetService } from "./dataset-service";
import { CloudflareExecutionStore } from "./execution-store";
import { CloudflareMonitoringService } from "./monitoring-service";
import { CloudflareObjectStore } from "./object-store";
import { CloudflareQueueService } from "./queue-service";

export { WorkerRuntime } from "@dafthunk/runtime";

/**
 * Creates a WorkerRuntime with Cloudflare production dependencies.
 */
export function createWorkerRuntime(env: Bindings): WorkerRuntime<Bindings> {
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

  return new WorkerRuntime(env, dependencies);
}
