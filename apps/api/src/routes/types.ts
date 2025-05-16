import { GetNodeTypesResponse } from "@dafthunk/types";
import { Hono } from "hono";

import { ApiContext } from "../context";
import { NodeRegistry } from "../nodes/nodeRegistry";

const typeRoutes = new Hono<ApiContext>();

typeRoutes.get("/", (c) => {
  try {
    const registry = NodeRegistry.getInstance();
    const nodeTypes = registry.getNodeTypes();
    return c.json({ nodeTypes } as GetNodeTypesResponse);
  } catch (error) {
    console.error("Error getting node types:", error);
    return c.json({ error: "Failed to get node types" }, 500);
  }
});

export default typeRoutes;
