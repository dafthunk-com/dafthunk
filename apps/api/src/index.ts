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
import discordBotRoutes from "./routes/discord-bots";
import discordWebhook from "./routes/discord-webhook";
import emailRoutes from "./routes/emails";
import endpointExecuteRoutes from "./routes/endpoint-execute";
import endpointRoutes from "./routes/endpoints";
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
import queuePublishRoutes from "./routes/queue-publish";
import queueRoutes from "./routes/queues";
import replicateRoutes from "./routes/replicate";
import robotsRoutes from "./routes/robots";
import secretRoutes from "./routes/secrets";
import stripeWebhooks from "./routes/stripe-webhooks";
import telegramBotRoutes from "./routes/telegram-bots";
import telegramWebhook from "./routes/telegram-webhook";
import templateRoutes from "./routes/templates";
import typeRoutes from "./routes/types";
import usageRoutes from "./routes/usage";
import whatsappAccountRoutes from "./routes/whatsapp-accounts";
import whatsappWebhook from "./routes/whatsapp-webhook";
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

// Telegram webhook (no auth, called by Telegram)
app.route("/telegram", telegramWebhook);

// Discord webhook (no auth, verified by Ed25519 signature)
app.route("/discord", discordWebhook);

// WhatsApp webhook (no auth, verified by HMAC-SHA256 signature)
app.route("/whatsapp", whatsappWebhook);

// Trigger execution (API key auth, org derived from resource record)
app.route("/endpoints", endpointExecuteRoutes);
app.route("/queues", queuePublishRoutes);

// Replicate schema proxy (JWT-authenticated, not org-scoped)
app.route("/replicate", replicateRoutes);

// Public routes
app.route("/templates", templateRoutes);
app.route("/types", typeRoutes);

app.route("/:organizationId/api-keys", apiKeyRoutes);
app.route("/:organizationId/billing", billingRoutes);
app.route("/:organizationId/dashboard", dashboardRoutes);
app.route("/:organizationId/databases", databaseRoutes);
app.route("/:organizationId/datasets", datasetRoutes);
app.route("/:organizationId/discord-bots", discordBotRoutes);
app.route("/:organizationId/emails", emailRoutes);
app.route("/:organizationId/feedback", feedbackRoutes);
app.route("/:organizationId/executions", executionRoutes);
app.route("/:organizationId/endpoints", endpointRoutes);
app.route("/:organizationId/integrations", integrationRoutes);
app.route("/:organizationId/queues", queueRoutes);
app.route("/:organizationId/secrets", secretRoutes);
app.route("/:organizationId/telegram-bots", telegramBotRoutes);
app.route("/:organizationId/whatsapp-accounts", whatsappAccountRoutes);
app.route("/:organizationId/workflows", workflowRoutes);
app.route("/:organizationId/objects", objectRoutes);
app.route("/:organizationId/playground", playgroundRoutes);
app.route("/:organizationId/usage", usageRoutes);
app.route("/:organizationId/ws", wsRoutes);

// Export Durable Objects
export { Session as WorkflowSession };
export { DatabaseDO };
export { Sandbox } from "@cloudflare/sandbox";
export { FFmpegContainer } from "./containers/ffmpeg-container";
export { AgentRunner } from "./durable-objects/agent-runner";

export default {
  email: handleIncomingEmail,
  queue: handleQueueMessages,
  scheduled: handleScheduledEvent,
  fetch: app.fetch,
};
