import { Hono } from "hono";

import type { ApiContext } from "../context";
import { getTemplateById, workflowTemplates } from "../templates";

const templates = new Hono<ApiContext>();

templates.get("/", (c) => {
  return c.json({ templates: workflowTemplates });
});

templates.get("/:id", (c) => {
  const id = c.req.param("id");
  const template = getTemplateById(id);

  if (!template) {
    return c.json({ error: "Template not found" }, 404);
  }

  return c.json(template);
});

export default templates;
