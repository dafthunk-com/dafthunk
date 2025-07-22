import { initializeApiBaseUrl } from "../src/config/api";
import { render } from "../src/entry-server";
import {
  applySecurityHeadersToResponse,
  shouldApplySecurityHeaders,
} from "../src/utils/security-headers";

interface Env {
  ASSETS: Fetcher;
  VITE_API_HOST?: string;
}

/**
 * Apply security headers to responses
 */
function addSecurityHeaders(response: Response): Response {
  const contentType = response.headers.get("content-type");
  if (shouldApplySecurityHeaders(contentType, response.status)) {
    return applySecurityHeadersToResponse(response, {
      environment: "production",
      enforceHttps: true,
    });
  }
  return response;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  initializeApiBaseUrl(env.VITE_API_HOST);

  const url = new URL(request.url);

  const assetPattern =
    /\.(js|css|svg|png|jpg|jpeg|gif|ico|webmanifest|map|txt|json)$/i;
  if (assetPattern.test(url.pathname) || url.pathname.startsWith("/assets/")) {
    return env.ASSETS.fetch(request);
  }

  try {
    const indexHtmlUrl = new URL("/index.html", request.url);

    const indexHtmlResponse = await env.ASSETS.fetch(indexHtmlUrl.toString());

    if (!indexHtmlResponse.ok) {
      console.error(
        `Error fetching index.html: ${indexHtmlResponse.status} ${indexHtmlResponse.statusText} for URL ${indexHtmlUrl.toString()}`
      );
      return env.ASSETS.fetch(request);
    }
    const template = await indexHtmlResponse.text();

    const rendered = await render(request.clone() as unknown as Request);
    const html = template
      .replace(`<!--app-head-->`, rendered.headHtml ?? "")
      .replace(`<!--app-html-->`, "");

    const response = new Response(html, {
      headers: { "Content-Type": "text/html" },
      status: 200,
    });

    return addSecurityHeaders(response);
  } catch (e: any) {
    if (e instanceof Response) {
      return addSecurityHeaders(e);
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
    const errorResponse = new Response(
      "Internal Server Error. Please try again later.",
      {
        status: 500,
        headers: { "Content-Type": "text/html" },
      }
    );

    return addSecurityHeaders(errorResponse);
  }
};
