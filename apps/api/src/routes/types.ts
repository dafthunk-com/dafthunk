import { Hono } from "hono";
import { NodeRegistry } from "../nodes/nodeRegistry";
import { ApiContext } from "../context";
import { jwtAuth } from "../auth";

const typeRoutes = new Hono<ApiContext>();

typeRoutes.get("/", jwtAuth, (c) => {
  try {
    const registry = NodeRegistry.getInstance();
    return c.json(registry.getNodeTypes());
  } catch (error) {
    console.error("Error getting node types:", error);
    return c.json({ error: "Failed to get node types" }, 500);
  }
});

export default typeRoutes;
