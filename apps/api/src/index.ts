import { Hono } from "hono";
import { cors } from "hono/cors";
export { Runtime } from "./runtime/runtime";
import {AppContext} from "./types/bindings";

// Import routes
import auth from "./routes/auth";
import objects from "./routes/objects";
import workflowRoutes from "./routes/workflows";
import executionRoutes from "./routes/executions";
import typeRoutes from "./routes/types";
import health from "./routes/health";
import {corsMiddleware} from "./middleware/cors";

// Initialize Hono app with types
const app = new Hono<AppContext>();

// Global middleware
app.use("*", corsMiddleware);

// Mount routes
app.route("/health", health);
app.route("/auth", auth);
app.route("/objects", objects);
app.route("/workflows", workflowRoutes);
app.route("/executions", executionRoutes);
app.route("/types", typeRoutes);

export default {
  fetch: app.fetch,
};
