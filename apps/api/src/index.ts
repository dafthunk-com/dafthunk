import { Hono } from "hono";
export { Runtime } from "./runtime/runtime";
import auth from "./auth";
import { ApiContext } from "./context";
import { handleCronTriggers } from "./cron";
import { handleIncomingEmail } from "./email";
import { corsMiddleware } from "./middleware/cors";
import { createRateLimitMiddleware } from "./middleware/rate-limit";
import apiKeyRoutes from "./routes/api-keys";
import dashboardRoutes from "./routes/dashboard";
import datasetRoutes from "./routes/datasets";
import deploymentRoutes from "./routes/deployments";
import executionRoutes from "./routes/executions";
import health from "./routes/health";
import llmsRoutes from "./routes/llms";
import objectRoutes from "./routes/objects";
import profileRoutes from "./routes/profile";
import publicRoutes from "./routes/public";
import robotsRoutes from "./routes/robots";
import typeRoutes from "./routes/types";
import usageRoutes from "./routes/usage";
import workflowRoutes from "./routes/workflows";

// Initialize Hono app with types
const app = new Hono<ApiContext>();

// Global middleware
app.use("*", corsMiddleware);

// Apply rate limiting to all routes except health check
app.use("*", async (c, next) => {
  if (c.req.path === "/health") {
    return next();
  }

  // Use stricter rate limiting for auth routes
  if (c.req.path.startsWith("/auth/login") || c.req.path === "/auth/refresh") {
    const rateLimit = createRateLimitMiddleware(c.env.RATE_LIMIT_AUTH);
    return rateLimit(c, next);
  }

  // Use default rate limiting for other routes
  const rateLimit = createRateLimitMiddleware(c.env.RATE_LIMIT_DEFAULT);
  return rateLimit(c, next);
});

// Mount routes
app.route("/health", health);
app.route("/auth", auth);
app.route("/profile", profileRoutes);
app.route("/robots.txt", robotsRoutes);
app.route("/llms.txt", llmsRoutes);

// Public routes
app.route("/public", publicRoutes);
app.route("/types", typeRoutes);

app.route("/:organizationIdOrHandle/api-keys", apiKeyRoutes);
app.route("/:organizationIdOrHandle/dashboard", dashboardRoutes);
app.route("/:organizationIdOrHandle/datasets", datasetRoutes);
app.route("/:organizationIdOrHandle/deployments", deploymentRoutes);
app.route("/:organizationIdOrHandle/executions", executionRoutes);
app.route("/:organizationIdOrHandle/workflows", workflowRoutes);
app.route("/:organizationIdOrHandle/objects", objectRoutes);
app.route("/:organizationIdOrHandle/usage", usageRoutes);

export default {
  scheduled: handleCronTriggers,
  email: handleIncomingEmail,
  fetch: app.fetch,
};
