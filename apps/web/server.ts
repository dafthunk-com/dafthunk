import fs from "node:fs/promises";

import express from "express";
import { createServer } from "vite";

import {
  applySecurityHeaders,
  shouldApplySecurityHeaders,
} from "./src/utils/security-headers";

const port = process.env.PORT || 3000;
const app = express();

/**
 * Middleware to add security headers to responses
 */
app.use((_, res, next) => {
  const originalJson = res.json;
  const originalSend = res.send;

  res.send = function (body) {
    addSecurityHeaders(this);
    return originalSend.call(this, body);
  };

  res.json = function (obj) {
    addSecurityHeaders(this);
    return originalJson.call(this, obj);
  };

  function addSecurityHeaders(response: express.Response) {
    const contentType = response.get("Content-Type");
    if (shouldApplySecurityHeaders(contentType, response.statusCode)) {
      applySecurityHeaders(response, {
        environment:
          process.env.NODE_ENV === "production" ? "production" : "development",
        enforceHttps: process.env.NODE_ENV === "production",
      });
    }
  }

  next();
});

const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
app.use(vite.middlewares);

let template = await fs.readFile("./index.html", "utf-8");
const render = (await vite.ssrLoadModule("/src/entry-server.tsx")).render;

// Serve HTML
app.use("*all", async (req, res) => {
  try {
    const pathname = req.originalUrl;
    template = await vite.transformIndexHtml(pathname, template);

    // Construct a Fetch API Request object from the Express request
    const url = new URL(
      req.originalUrl,
      `${req.protocol}://${req.get("host")}`
    );
    const fetchRequest = new Request(url.href, {
      method: req.method,
      headers: new Headers(req.headers as HeadersInit),
    });

    const rendered = await render(fetchRequest);

    const html = template
      .replace(`<!--app-head-->`, rendered.headHtml ?? "")
      .replace(`<!--app-html-->`, "");

    res.status(200).set({ "Content-Type": "text/html" }).send(html);
  } catch (e: any) {
    vite?.ssrFixStacktrace(e);
    console.log(e.stack);
    res.status(500).end(e.stack);
  }
});

// Start http server
app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
