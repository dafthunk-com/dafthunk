import { Hono } from "hono";
import { AppContext } from "../types/bindings";

const health = new Hono<AppContext>();

health.get("/health", (c) =>
    c.json({
      status: "ok",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    })
);

export default health;
