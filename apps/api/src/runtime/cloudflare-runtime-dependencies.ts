/**
 * Shared Cloudflare runtime dependency construction.
 *
 * Both WorkerRuntime and WorkflowRuntime use the same production services
 * (node registry, credential provider, object store, etc.) — they only
 * differ in monitoring strategy. This module constructs the common
 * dependency bag once and is used by both runtime factories.
 */

import {
  type MonitoringService,
  type RuntimeDependencies,
} from "@dafthunk/runtime";

import type { Bindings } from "../context";
import { CloudflareCredentialService } from "./cloudflare-credential-service";
import { CloudflareCreditService } from "./cloudflare-credit-service";
import { CloudflareDatabaseService } from "./cloudflare-database-service";
import { CloudflareDatasetService } from "./cloudflare-dataset-service";
import { CloudflareExecutionStore } from "./cloudflare-execution-store";
import { CloudflareNodeRegistry } from "./cloudflare-node-registry";
import {
  buildPresignedUrlConfig,
  CloudflareObjectStore,
} from "./cloudflare-object-store";
import { CloudflareQueueService } from "./cloudflare-queue-service";
import { CloudflareSchemaService } from "./cloudflare-schema-service";
import { CloudflareToolRegistry } from "./cloudflare-tool-registry";
import { createToolContext } from "./tool-context";
import { runtimeVersion } from "./version";

export function buildDependencies(
  env: Bindings,
  monitoringService: MonitoringService
): RuntimeDependencies<Bindings> {
  const nodeRegistry = new CloudflareNodeRegistry(env, true);
  const objectStore = new CloudflareObjectStore(
    env.RESSOURCES,
    buildPresignedUrlConfig(env)
  );
  const credentialProvider = new CloudflareCredentialService(env);
  const databaseService = new CloudflareDatabaseService(env);
  const datasetService = new CloudflareDatasetService(env);
  const queueService = new CloudflareQueueService(env);
  const schemaService = new CloudflareSchemaService(env);
  const toolRegistry = new CloudflareToolRegistry(
    nodeRegistry,
    (nodeId, inputs) =>
      createToolContext(nodeId, inputs, env, objectStore, credentialProvider, {
        databaseService,
        datasetService,
        queueService,
        schemaService,
      })
  );

  return {
    nodeRegistry,
    credentialProvider,
    executionStore: new CloudflareExecutionStore(env),
    monitoringService,
    creditService: new CloudflareCreditService(
      env.KV,
      env.CLOUDFLARE_ENV === "development"
    ),
    objectStore,
    toolRegistry,
    databaseService,
    datasetService,
    queueService,
    schemaService,
    runtimeVersion,
  };
}
