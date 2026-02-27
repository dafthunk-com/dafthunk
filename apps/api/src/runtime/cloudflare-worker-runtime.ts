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
import { CloudflareCredentialService } from "./cloudflare-credential-service";
import { CloudflareCreditService } from "./cloudflare-credit-service";
import { CloudflareDatabaseService } from "./cloudflare-database-service";
import { CloudflareDatasetService } from "./cloudflare-dataset-service";
import { CloudflareExecutionStore } from "./cloudflare-execution-store";
import { CloudflareMonitoringService } from "./cloudflare-monitoring-service";
import { CloudflareNodeRegistry } from "./cloudflare-node-registry";
import {
  buildPresignedUrlConfig,
  CloudflareObjectStore,
} from "./cloudflare-object-store";
import { CloudflareQueueService } from "./cloudflare-queue-service";
import { CloudflareToolRegistry } from "./cloudflare-tool-registry";
import { createToolContext } from "./tool-context";

export { WorkerRuntime } from "@dafthunk/runtime";

/**
 * Creates a WorkerRuntime with Cloudflare production dependencies.
 */
export function createWorkerRuntime(env: Bindings): WorkerRuntime<Bindings> {
  const nodeRegistry = new CloudflareNodeRegistry(env, true);
  const objectStore = new CloudflareObjectStore(
    env.RESSOURCES,
    buildPresignedUrlConfig(env)
  );
  const credentialProvider = new CloudflareCredentialService(env);
  const databaseService = new CloudflareDatabaseService(env);
  const datasetService = new CloudflareDatasetService(env);
  const queueService = new CloudflareQueueService(env);
  const toolRegistry = new CloudflareToolRegistry(
    nodeRegistry,
    (nodeId, inputs) =>
      createToolContext(nodeId, inputs, env, objectStore, credentialProvider, {
        databaseService,
        datasetService,
        queueService,
      })
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
    objectStore,
    toolRegistry,
    databaseService,
    datasetService,
    queueService,
  };

  return new WorkerRuntime(env, dependencies);
}
