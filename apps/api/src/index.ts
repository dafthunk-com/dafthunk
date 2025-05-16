import { Hono } from "hono";
export { Runtime } from "./runtime/runtime";
import { ApiContext } from "./context";

import { corsMiddleware } from "./middleware/cors";
// Import routes
import auth from "./auth";
import objectRoutes from "./routes/objects";
import publicObjectRoutes from "./routes/publicObjects";
import workflowRoutes from "./routes/workflows";
import executionRoutes from "./routes/executions";
import publicExecutionRoutes from "./routes/publicExecutions";
import typeRoutes from "./routes/types";
import health from "./routes/health";
import apiKeyRoutes from "./routes/apiKeys";
import deploymentRoutes from "./routes/deployments";
import robotsRoutes from "./routes/robots";
import llmsRoutes from "./routes/llms";
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

// Public routes
app.route("/public/executions", publicExecutionRoutes);
app.route("/public/objects", publicObjectRoutes);

// Protected routes
app.route("/:orgHandle/api-keys", apiKeyRoutes);
app.route("/:orgHandle/dashboard", dashboardRoutes);
app.route("/:orgHandle/deployments", deploymentRoutes);
app.route("/:orgHandle/executions", executionRoutes);
app.route("/:orgHandle/workflows", workflowRoutes);
app.route("/:orgHandle/types", typeRoutes);
app.route("/:orgHandle/objects", objectRoutes);

export default {
  fetch: app.fetch,
};
