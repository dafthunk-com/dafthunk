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
  RehearsalNodeRegistry,
  type RuntimeDependencies,
} from "@dafthunk/runtime";

import type { Bindings } from "../context";
import { createDatabase } from "../db";
import { creditChecksEnabled } from "../utils/credits";
import { CloudflareCredentialService } from "./cloudflare-credential-service";
import { CloudflareCreditService } from "./cloudflare-credit-service";
import { CloudflareDatabaseService } from "./cloudflare-database-service";
import { CloudflareDatasetService } from "./cloudflare-dataset-service";
import { CloudflareExecutionStore } from "./cloudflare-execution-store";
import { CloudflareMailboxService } from "./cloudflare-mailbox-service";
import { CloudflareNodeRegistry } from "./cloudflare-node-registry";
import {
  buildPresignedUrlConfig,
  CloudflareObjectStore,
} from "./cloudflare-object-store";
import { CloudflareOrganizationService } from "./cloudflare-organization-service";
import { CloudflareQueueService } from "./cloudflare-queue-service";
import { CloudflareSchemaService } from "./cloudflare-schema-service";
import { CloudflareToolRegistry } from "./cloudflare-tool-registry";
import { createCodeModeExecutor } from "./code-mode-executor";
import { createSandboxExecutor } from "./sandbox-executor";
import { createToolContext } from "./tool-context";
import { runtimeVersion } from "./version";

export interface BuildDependenciesOptions {
  /**
   * Wrap the node registry so outward writes are stubbed and nothing leaves
   * the platform. The same wrapped instance feeds the tool registry, so
   * LLM-agent tool calls to outward nodes are stubbed too.
   */
  rehearsal?: boolean;
}

export function buildDependencies(
  env: Bindings,
  monitoringService: MonitoringService,
  options?: BuildDependenciesOptions
): RuntimeDependencies<Bindings> {
  const nodeRegistry = options?.rehearsal
    ? new RehearsalNodeRegistry(new CloudflareNodeRegistry(env, true), env)
    : new CloudflareNodeRegistry(env, true);
  const objectStore = new CloudflareObjectStore(
    env.RESSOURCES,
    buildPresignedUrlConfig(env)
  );
  const credentialProvider = new CloudflareCredentialService(env);
  const databaseService = new CloudflareDatabaseService(env);
  const datasetService = new CloudflareDatasetService(env);
  const queueService = new CloudflareQueueService(env);
  const schemaService = new CloudflareSchemaService(env);
  const mailboxService = new CloudflareMailboxService(env);
  const organizationService = new CloudflareOrganizationService(env);
  const codeModeExecutor = createCodeModeExecutor(env) ?? undefined;
  // One sandbox container per execution — fresh ID isolates runs from each other
  // while reusing the same sandbox across nodes within a run.
  const sandboxExecutor =
    createSandboxExecutor(env, `exec-${crypto.randomUUID()}`) ?? undefined;

  const toolRegistry = new CloudflareToolRegistry(
    nodeRegistry,
    (nodeId, inputs) =>
      createToolContext(nodeId, inputs, env, objectStore, credentialProvider, {
        databaseService,
        datasetService,
        queueService,
        schemaService,
        codeModeExecutor,
        sandboxExecutor,
      })
  );

  return {
    nodeRegistry,
    credentialProvider,
    executionStore: new CloudflareExecutionStore(env),
    monitoringService,
    creditService: new CloudflareCreditService(
      env.KV,
      createDatabase(env.DB),
      !creditChecksEnabled(env.CLOUDFLARE_ENV)
    ),
    objectStore,
    toolRegistry,
    databaseService,
    datasetService,
    queueService,
    schemaService,
    mailboxService,
    organizationService,
    codeModeExecutor,
    sandboxExecutor,
    runtimeVersion,
  };
}
