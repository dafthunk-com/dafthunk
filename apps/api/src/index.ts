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
import apiKeyRoutes from "./routes/apiKeys";
import deploymentRoutes from "./routes/deployments";
import robotsRoutes from "./routes/robots";
import { corsMiddleware } from "./middleware/cors";
import dashboardRoutes from "./routes/dashboard";
// Initialize Hono app with types
const app = new Hono<ApiContext>();

// Global middleware
app.use("*", corsMiddleware);

// Mount routes
app.route("/health", health);
app.route("/auth", auth);
app.route("/objects", objects);
app.route("/dashboard", dashboardRoutes);
app.route("/workflows", workflowRoutes);
app.route("/executions", executionRoutes);
app.route("/types", typeRoutes);
app.route("/deployments", deploymentRoutes);
app.route("/robots.txt", robotsRoutes);

app.route("/:orgHandle/api-keys", apiKeyRoutes);

export default {
  fetch: app.fetch,
};
