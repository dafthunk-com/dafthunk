import { GetNodeTypesResponse, WorkflowType } from "@dafthunk/types";
import { Hono } from "hono";

import { ApiContext } from "../context";
import { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import { optionalJwtMiddleware } from "../auth";

const typeRoutes = new Hono<ApiContext>();

typeRoutes.get("/", optionalJwtMiddleware, (c) => {
  try {
    const jwtPayload = c.get("jwtPayload");
    const registry = new CloudflareNodeRegistry(
      c.env,
      jwtPayload?.developerMode ?? false
    );
    const workflowType = c.req.query("workflowType") as
      | WorkflowType
      | undefined;
    const nodeTypes = registry.getNodeTypes(workflowType);
    return c.json({ nodeTypes } as GetNodeTypesResponse);
  } catch (error) {
    console.error("Error getting node types:", error);
    return c.json({ error: "Failed to get node types" }, 500);
  }
});

export default typeRoutes;
