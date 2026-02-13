import { Hono } from "hono";

import auth from "./auth";
import { ApiContext } from "./context";
import { DatabaseDO } from "./durable-objects/database-do";
import { handleIncomingEmail } from "./email";
import { corsMiddleware } from "./middleware/cors";
import { createRateLimitMiddleware } from "./middleware/rate-limit";
import { handleQueueMessages } from "./queue";
import adminRoutes from "./routes/admin";
import apiKeyRoutes from "./routes/api-keys";
import billingRoutes from "./routes/billing";
import dashboardRoutes from "./routes/dashboard";
import databaseRoutes from "./routes/databases";
import datasetRoutes from "./routes/datasets";
import deploymentRoutes from "./routes/deployments";
import emailRoutes from "./routes/emails";
import evaluationRoutes from "./routes/evaluations";
import executionRoutes from "./routes/executions";
import feedbackRoutes from "./routes/feedback";
import health from "./routes/health";
import integrationRoutes from "./routes/integrations";
import invitationRoutes from "./routes/invitations";
import llmsRoutes from "./routes/llms";
import oauthRoutes from "./routes/oauth";
import objectRoutes from "./routes/objects";
import organizationRoutes from "./routes/organizations";
import playgroundRoutes from "./routes/playground";
import profileRoutes from "./routes/profile";
import queueRoutes from "./routes/queues";
import robotsRoutes from "./routes/robots";
import secretRoutes from "./routes/secrets";
import stripeWebhooks from "./routes/stripe-webhooks";
import templateRoutes from "./routes/templates";
import typeRoutes from "./routes/types";
import usageRoutes from "./routes/usage";
import workflowRoutes from "./routes/workflows";
import wsRoutes from "./routes/ws";
import { handleScheduledEvent } from "./scheduled";
import { Session } from "./session/session";

// Export WorkflowRuntimeEntrypoint as "Runtime" for wrangler config compatibility
export { WorkflowRuntimeEntrypoint as Runtime } from "./runtime/cloudflare-workflow-runtime-entrypoint";

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
app.route("/admin", adminRoutes);
app.route("/oauth", oauthRoutes);
app.route("/profile", profileRoutes);
app.route("/organizations", organizationRoutes);
app.route("/invitations", invitationRoutes);
app.route("/robots.txt", robotsRoutes);
app.route("/llms.txt", llmsRoutes);

// Stripe webhooks (no auth, verified by signature)
app.route("/stripe/webhooks", stripeWebhooks);

// Public routes
app.route("/templates", templateRoutes);
app.route("/types", typeRoutes);

app.route("/:organizationIdOrHandle/api-keys", apiKeyRoutes);
app.route("/:organizationIdOrHandle/billing", billingRoutes);
app.route("/:organizationIdOrHandle/dashboard", dashboardRoutes);
app.route("/:organizationIdOrHandle/databases", databaseRoutes);
app.route("/:organizationIdOrHandle/datasets", datasetRoutes);
app.route("/:organizationIdOrHandle/deployments", deploymentRoutes);
app.route("/:organizationIdOrHandle/emails", emailRoutes);
app.route("/:organizationIdOrHandle/evaluations", evaluationRoutes);
app.route("/:organizationIdOrHandle/feedback", feedbackRoutes);
app.route("/:organizationIdOrHandle/executions", executionRoutes);
app.route("/:organizationIdOrHandle/integrations", integrationRoutes);
app.route("/:organizationIdOrHandle/queues", queueRoutes);
app.route("/:organizationIdOrHandle/secrets", secretRoutes);
app.route("/:organizationIdOrHandle/workflows", workflowRoutes);
app.route("/:organizationIdOrHandle/objects", objectRoutes);
app.route("/:organizationIdOrHandle/playground", playgroundRoutes);
app.route("/:organizationIdOrHandle/usage", usageRoutes);
app.route("/:organizationIdOrHandle/ws", wsRoutes);

// Export Durable Objects
export { Session as WorkflowSession };
export { DatabaseDO };

export default {
  email: handleIncomingEmail,
  queue: handleQueueMessages,
  scheduled: handleScheduledEvent,
  fetch: app.fetch,
};
