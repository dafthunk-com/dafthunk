import { initializeApiBaseUrl } from "../src/config/api";
import { render } from "../src/entry-server";
import { injectNonceIntoHTML } from "../src/utils/security-headers";
import {
  createSecurityMiddleware,
  SecurityMiddlewareContext,
} from "./middleware/security-headers";

export interface Env {
  ASSETS: Fetcher;
  VITE_API_HOST?: string;
}

async function handleRequest(
  request: Request,
  env: Env,
  context: SecurityMiddlewareContext
): Promise<Response> {
  // Initialize API base URL
  initializeApiBaseUrl(env.VITE_API_HOST);

  const { nonce } = context;
  const url = new URL(request.url);

  // Handle static assets first
  const assetPattern =
    /\.(js|css|svg|png|jpg|jpeg|gif|ico|webmanifest|map|txt|json)$/i;
  if (assetPattern.test(url.pathname) || url.pathname.startsWith("/assets/")) {
    return await env.ASSETS.fetch(request);
  }

  try {
    // Fetch the index.html template
    const indexHtmlUrl = new URL("/index.html", request.url);
    const indexHtmlResponse = await env.ASSETS.fetch(indexHtmlUrl.toString());

    if (!indexHtmlResponse.ok) {
      console.error(
        `Error fetching index.html: ${indexHtmlResponse.status} ${indexHtmlResponse.statusText} for URL ${indexHtmlUrl.toString()}`
      );
      return await env.ASSETS.fetch(request);
    }

    const template = await indexHtmlResponse.text();

    // Perform server-side rendering
    const rendered = await render(request.clone() as unknown as Request);
    let html = template
      .replace(`<!--app-head-->`, rendered.headHtml ?? "")
      .replace(`<!--app-html-->`, "");

    // Inject nonce into script tags
    html = injectNonceIntoHTML(html, nonce);

    return new Response(html, {
      headers: { "Content-Type": "text/html" },
      status: 200,
    });
  } catch (e: any) {
    if (e instanceof Response) {
      return e;
    }

    console.error("SSR Function Error:", e.stack || e);

    try {
      const fallbackResponse = await env.ASSETS.fetch(
        request.clone() as unknown as Request
      );
      if (fallbackResponse.ok) {
        return fallbackResponse;
      }
    } catch (fetchError) {
      console.error("SSR Fallback ASSETS.fetch error:", fetchError);
    }

    return new Response("Internal Server Error. Please try again later.", {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
}

export default {
  fetch: createSecurityMiddleware(handleRequest),
};
