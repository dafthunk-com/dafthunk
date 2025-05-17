import { Hono } from "hono";
export { Runtime } from "./runtime/runtime";
import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

import auth from "./auth";
import { ApiContext } from "./context";
import { corsMiddleware } from "./middleware/cors";
import apiKeyRoutes from "./routes/apiKeys";
import dashboardRoutes from "./routes/dashboard";
import deploymentRoutes from "./routes/deployments";
import executionRoutes from "./routes/executions";
// Routes
import health from "./routes/health";
import llmsRoutes from "./routes/llms";
import objectRoutes from "./routes/objects";
import publicExecutionRoutes from "./routes/publicExecutions";
import publicImageRoutes from "./routes/publicImages";
import publicObjectRoutes from "./routes/publicObjects";
import robotsRoutes from "./routes/robots";
import typeRoutes from "./routes/types";
import workflowRoutes from "./routes/workflows";

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
app.route("/public/images", publicImageRoutes);

// Protected routes
app.route("/:orgHandle/api-keys", apiKeyRoutes);
app.route("/:orgHandle/dashboard", dashboardRoutes);
app.route("/:orgHandle/deployments", deploymentRoutes);
app.route("/:orgHandle/executions", executionRoutes);
app.route("/:orgHandle/workflows", workflowRoutes);
app.route("/:orgHandle/types", typeRoutes);
app.route("/:orgHandle/objects", objectRoutes);

export default {
  async email(
    message: ForwardableEmailMessage,
    _env: object,
    _ctx: object
  ): Promise<void> {
    const msg = createMimeMessage();

    msg.setHeader("In-Reply-To", message.headers.get("Message-ID") || "");
    msg.setSender({ name: "Dafthunk", addr: message.to });
    msg.setRecipient(message.from);
    msg.setSubject("Email Routing Auto-reply");

    msg.addMessage({
      contentType: "text/html",
      data: `<html><body><p>We got your message, we will get back to you soon.</p></body></html>`,
    });

    msg.addMessage({
      contentType: "text/plain",
      data: `We got your message, we will get back to you soon.`,
    });

    const replyMessage = new EmailMessage(
      message.to,
      message.from,
      msg.asRaw()
    );

    await message.reply(replyMessage);
  },
  fetch: app.fetch,
};
