/**
 * Shared service wiring for the agent Durable Objects.
 *
 * Builds the node-backed tool provider and resolves/wraps tool definitions —
 * the parts AgentRunner and EmailAgentRunner have in common.
 */

import type { ToolDefinition, ToolReference } from "@dafthunk/runtime";
import { NodeToolProvider } from "@dafthunk/runtime";
import { createCodeModeToolDefinition } from "@dafthunk/runtime/utils/code-mode";
import { schemaToJsonSchema } from "@dafthunk/runtime/utils/schema-to-json-schema";
import type { Schema } from "@dafthunk/types";

import type { Bindings } from "../context";
import { CloudflareCredentialService } from "../runtime/cloudflare-credential-service";
import { CloudflareDatabaseService } from "../runtime/cloudflare-database-service";
import { CloudflareDatasetService } from "../runtime/cloudflare-dataset-service";
import { CloudflareNodeRegistry } from "../runtime/cloudflare-node-registry";
import {
  buildPresignedUrlConfig,
  CloudflareObjectStore,
} from "../runtime/cloudflare-object-store";
import { CloudflareQueueService } from "../runtime/cloudflare-queue-service";
import { createCodeModeExecutor } from "../runtime/code-mode-executor";
import { createToolContext } from "../runtime/tool-context";

/** Build a NodeToolProvider scoped to an organization's credentials/services. */
export async function buildNodeToolProvider(
  env: Bindings,
  organizationId: string
): Promise<NodeToolProvider> {
  const nodeRegistry = new CloudflareNodeRegistry(env, false);
  const objectStore = new CloudflareObjectStore(
    env.RESSOURCES,
    buildPresignedUrlConfig(env)
  );
  const credentialService = new CloudflareCredentialService(env);
  await credentialService.initialize(organizationId);
  const databaseService = new CloudflareDatabaseService(env);
  const datasetService = new CloudflareDatasetService(env);
  const queueService = new CloudflareQueueService(env);

  return new NodeToolProvider(nodeRegistry, (nodeId, inputs) =>
    createToolContext(nodeId, inputs, env, objectStore, credentialService, {
      databaseService,
      datasetService,
      queueService,
    })
  );
}

/** Resolve tool references into executable tool definitions. */
export async function resolveTools(
  toolRefs: ToolReference[],
  provider: NodeToolProvider
): Promise<ToolDefinition[]> {
  if (!toolRefs || toolRefs.length === 0) return [];

  const definitions: ToolDefinition[] = [];
  for (const ref of toolRefs) {
    try {
      const def = await provider.getToolDefinition(ref.identifier, ref.config);
      definitions.push(def);
    } catch (error) {
      console.warn(`Failed to resolve tool ${ref.identifier}:`, error);
    }
  }
  return definitions;
}

/**
 * When code mode is enabled, collapse all tools into a single "codemode" tool.
 * Falls back to the original tools when the executor binding is unavailable.
 */
export function applyCodeMode(
  env: Bindings,
  tools: ToolDefinition[],
  codeMode: boolean
): ToolDefinition[] {
  if (!codeMode || tools.length === 0) return tools;

  const executor = createCodeModeExecutor(env);
  if (!executor) {
    console.warn(
      "Code mode requested but LOADER binding is unavailable — falling back to standard tool calling"
    );
    return tools;
  }

  return [createCodeModeToolDefinition(tools, executor)];
}

/**
 * Convert a node `Schema` into a JSON schema for structured output. Inputs that
 * are already JSON schemas (no `fields` property) pass through unchanged;
 * `undefined`/non-objects yield `undefined`.
 */
export function toJsonSchema(
  schema: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!schema || typeof schema !== "object") return undefined;
  if ("fields" in schema) {
    return schemaToJsonSchema(schema as unknown as Schema);
  }
  return schema;
}
