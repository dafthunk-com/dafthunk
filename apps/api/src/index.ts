import { Hono } from "hono";
export { Runtime } from "./runtime/runtime";
import auth from "./auth";
import { ApiContext } from "./context";
import { handleIncomingEmail } from "./email";
import { corsMiddleware } from "./middleware/cors";
import { NodeRegistry } from "./nodes/node-registry";
import apiKeyRoutes from "./routes/api-keys";
import dashboardRoutes from "./routes/dashboard";
import deploymentRoutes from "./routes/deployments";
import executionRoutes from "./routes/executions";
import health from "./routes/health";
import llmsRoutes from "./routes/llms";
import objectRoutes from "./routes/objects";
import publicRoutes from "./routes/public";
import robotsRoutes from "./routes/robots";
import typeRoutes from "./routes/types";
import workflowRoutes from "./routes/workflows";

// Initialize Hono app with types
const app = new Hono<ApiContext>();

// Middleware to initialize NodeRegistry
app.use("*", async (c, next) => {
  NodeRegistry.initialize(c.env);
  await next();
});

// Global middleware
app.use("*", corsMiddleware);

// Mount routes
app.route("/health", health);
app.route("/auth", auth);
app.route("/robots.txt", robotsRoutes);
app.route("/llms.txt", llmsRoutes);

// Public routes
app.route("/public", publicRoutes);
app.route("/types", typeRoutes);

// Protected routes
app.route("/:orgHandle/api-keys", apiKeyRoutes);
app.route("/:orgHandle/dashboard", dashboardRoutes);
app.route("/:orgHandle/deployments", deploymentRoutes);
app.route("/:orgHandle/executions", executionRoutes);
app.route("/:orgHandle/workflows", workflowRoutes);
app.route("/:orgHandle/objects", objectRoutes);

export default {
  email: handleIncomingEmail,
  fetch: app.fetch,
};
