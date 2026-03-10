import type { GetNodeTypesResponse } from "@dafthunk/types";
import { Hono } from "hono";

import { optionalJwtMiddleware } from "../auth";
import type { ApiContext } from "../context";
import { CloudflareNodeRegistry } from "../runtime/cloudflare-node-registry";

const typeRoutes = new Hono<ApiContext>();

typeRoutes.get("/", optionalJwtMiddleware, (c) => {
  try {
    const jwtPayload = c.get("jwtPayload");
    const registry = new CloudflareNodeRegistry(
      c.env,
      jwtPayload?.developerMode ?? false
    );
    const nodeTypes = registry.getNodeTypes();
    return c.json({ nodeTypes } as GetNodeTypesResponse);
  } catch (error) {
    console.error("Error getting node types:", error);
    return c.json({ error: "Failed to get node types" }, 500);
  }
});

export default typeRoutes;
