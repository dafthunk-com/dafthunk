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
import llmsRoutes from "./routes/llms";
import { corsMiddleware } from "./middleware/cors";
import dashboardRoutes from "./routes/dashboard";
// Initialize Hono app with types
const app = new Hono<ApiContext>();

// Global middleware
app.use("*", corsMiddleware);

// Mount routes
app.route("/health", health);
app.route("/auth", auth);
app.route("/robots.txt", robotsRoutes);
app.route("/llms.txt", llmsRoutes);

app.route("/:orgHandle/api-keys", apiKeyRoutes);
app.route("/:orgHandle/dashboard", dashboardRoutes);
app.route("/:orgHandle/deployments", deploymentRoutes);
app.route("/:orgHandle/executions", executionRoutes);
app.route("/:orgHandle/workflows", workflowRoutes);
app.route("/:orgHandle/types", typeRoutes);
app.route("/:orgHandle/objects", objects);

export default {
  fetch: app.fetch,
};
