import { Hono } from "hono";

import { ApiContext } from "../context";

const app = new Hono<ApiContext>();

/**
 * Route handler for /llms.txt
 * Following the llms.txt specification from https://github.com/AnswerDotAI/llms-txt
 */
app.get("/", () => {
  // The content follows the llms.txt specification format
  const content = `# Dafthunk

> Dafthunk is a serverless workflow engine that allows you to build, deploy, and manage complex workflows at scale.

Dafthunk provides a powerful API for creating and managing workflows, executions, and objects. It's designed to be highly scalable and runs on Cloudflare Workers.
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/markdown",
    },
  });
});

export default app;
