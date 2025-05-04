import { Hono } from "hono";
export { Runtime } from "./runtime/runtime";
import { ApiContext } from "./context";

// Import routes
import auth from "./auth";
import objects from "./routes/objects";
import workflowRoutes from "./routes/workflows";
import executionRoutes from "./routes/executions";
import typeRoutes from "./routes/types";
import health from "./routes/health";
import tokenRoutes from "./routes/tokens";
import deploymentRoutes from "./routes/deployments";
import { corsMiddleware } from "./middleware/cors";

// Initialize Hono app with types
const app = new Hono<ApiContext>();

// Global middleware
app.use("*", corsMiddleware);

// Mount routes
app.route("/health", health);
app.route("/auth", auth);
app.route("/objects", objects);
app.route("/workflows", workflowRoutes);
app.route("/executions", executionRoutes);
app.route("/types", typeRoutes);
app.route("/tokens", tokenRoutes);
app.route("/deployments", deploymentRoutes);

export default {
  fetch: app.fetch,
};
