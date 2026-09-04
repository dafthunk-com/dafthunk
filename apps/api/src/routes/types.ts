import type { GetNodeTypesResponse, NodeType } from "@dafthunk/types";
import { Hono } from "hono";

import { optionalJwtMiddleware } from "../auth";
import type { ApiContext } from "../context";
import { getCloudflareGatewayModelNodeTypes } from "../runtime/cloudflare-gateway-catalog";
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

    /**
     * Per-model NodeTypes, so each model surfaces directly in the palette
     * rather than behind a generic node someone has to configure.
     *
     * Two catalogs, because Cloudflare has two: Workers AI, listed by an
     * account API, and the unified partner catalog, which lists none and is
     * where video generation lives. They share no data and answer to
     * different hosts, so they run together and fail apart — either one
     * degrading to the static list leaves the other's models on the palette.
     *
     * Each is passed as a thunk rather than a started promise because
     * `c.executionCtx` throws when there is none, which is the ordinary case
     * in tests: reading it outside the guard turns a degradable failure into
     * a 500 for the whole palette.
     */
    const synthesised = async (
      label: string,
      load: () => Promise<NodeType[]>
    ): Promise<NodeType[]> => {
      try {
        return await load();
      } catch (error) {
        // Missing credentials, an upstream outage, or a test env without an
        // ExecutionContext. The generic model nodes remain as the fallback.
        console.warn(
          `[types] Skipping ${label} model synthesis:`,
          error instanceof Error ? error.message : error
        );
        return [];
      }
    };

    const [cloudflareNodeTypes, gatewayNodeTypes] = await Promise.all([
      synthesised("Cloudflare", () =>
        getCloudflareModelNodeTypes(c.env, c.executionCtx)
      ),
      synthesised("Cloudflare gateway", () =>
        getCloudflareGatewayModelNodeTypes(c.executionCtx)
      ),
    ]);

    const nodeTypes = [
      ...staticNodeTypes,
      ...cloudflareNodeTypes,
      ...gatewayNodeTypes,
    ];
    return c.json({ nodeTypes } as GetNodeTypesResponse);
  } catch (error) {
    console.error("Error getting node types:", error);
    return c.json({ error: "Failed to get node types" }, 500);
  }
});

export default typeRoutes;
