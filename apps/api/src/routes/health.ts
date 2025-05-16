import { Hono } from "hono";

import { ApiContext } from "../context";

const health = new Hono<ApiContext>();

health.get("/health", (c) =>
  c.json({
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  })
);

export default health;
