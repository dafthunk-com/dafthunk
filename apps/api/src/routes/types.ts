import type { GetNodeTypesResponse, NodeType } from "@dafthunk/types";
import { Hono } from "hono";

import { optionalJwtMiddleware } from "../auth";
import type { ApiContext } from "../context";
import { getCloudflareModelNodeTypes } from "../runtime/cloudflare-model-catalog";
import { CloudflareNodeRegistry } from "../runtime/cloudflare-node-registry";

const typeRoutes = new Hono<ApiContext>();

typeRoutes.get("/", optionalJwtMiddleware, async (c) => {
  try {
    const jwtPayload = c.get("jwtPayload");
    const registry = new CloudflareNodeRegistry(
      c.env,
      jwtPayload?.developerMode ?? false
    );
    const staticNodeTypes = registry.getNodeTypes();

    // Synthesise per-model NodeTypes from the Cloudflare catalog so each
    // Workers AI model surfaces directly in the editor's palette. Failures
    // (missing credentials, upstream outage, or test envs without an
    // ExecutionContext) degrade to the static list — the generic
    // `cloudflare-model` node remains available as a fallback.
    let cloudflareNodeTypes: NodeType[] = [];
    try {
      cloudflareNodeTypes = await getCloudflareModelNodeTypes(
        c.env,
        c.executionCtx
      );
    } catch (error) {
      console.warn(
        "[types] Skipping Cloudflare model synthesis:",
        error instanceof Error ? error.message : error
      );
    }

    const nodeTypes = [...staticNodeTypes, ...cloudflareNodeTypes];
    return c.json({ nodeTypes } as GetNodeTypesResponse);
  } catch (error) {
    console.error("Error getting node types:", error);
    return c.json({ error: "Failed to get node types" }, 500);
  }
});

export default typeRoutes;
