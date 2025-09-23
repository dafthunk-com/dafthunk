import fs from "node:fs/promises";

import express from "express";
import { createServer } from "vite";

import {
  addSecurityHeaders,
  generateNonce,
  injectNonceIntoHTML,
} from "./src/utils/security-headers";

const port = process.env.PORT || 3000;
const app = express();

/**
 * Middleware to add security headers to responses
 */
app.use((_, res, next) => {
  const originalJson = res.json;
  const originalSend = res.send;

  // Store nonce on the response object for later use
  res.locals.nonce = generateNonce();
  const environment =
    (process.env.NODE_ENV as "development" | "production") ?? "development";

  res.send = function (body) {
    addSecurityHeaders(this, {
      environment,
      nonce: res.locals.nonce,
      enforceHttps: false,
    });
    return originalSend.call(this, body);
  };

  res.json = function (obj) {
    addSecurityHeaders(this, {
      environment,
      nonce: res.locals.nonce,
      enforceHttps: false,
    });
    return originalJson.call(this, obj);
  };

  next();
});

const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
app.use(vite.middlewares);

const originalTemplate = await fs.readFile("./index.html", "utf-8");
const render = (await vite.ssrLoadModule("/src/entry-server.tsx")).render;

// Serve HTML
app.use("*all", async (req, res) => {
  try {
    const pathname = req.originalUrl;
    let html = await vite.transformIndexHtml(pathname, originalTemplate);

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

    html = html
      .replace(`<!--app-head-->`, rendered.headHtml ?? "")
      .replace(`<!--app-html-->`, "");

    // Inject nonce into script tags
    html = injectNonceIntoHTML(html, res.locals.nonce);

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
