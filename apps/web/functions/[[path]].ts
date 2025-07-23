import { initializeApiBaseUrl } from "../src/config/api";
import { render } from "../src/entry-server";
import { injectNonceIntoHTML } from "../src/utils/security-headers";

export interface Data extends Record<string, unknown> {
  nonce: string;
}

export interface Env {
  ASSETS: Fetcher;
  VITE_API_HOST?: string;
  NONCE: string;
}

export const onRequest: PagesFunction<Env, any, Data> = async (context) => {
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
    let html = template
      .replace(`<!--app-head-->`, rendered.headHtml ?? "")
      .replace(`<!--app-html-->`, "");

    // Inject nonce into script tags
    html = injectNonceIntoHTML(html, context.data.nonce);

    const response = new Response(html, {
      headers: { "Content-Type": "text/html" },
      status: 200,
    });

    return response;
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
    const errorResponse = new Response(
      "Internal Server Error. Please try again later.",
      {
        status: 500,
        headers: { "Content-Type": "text/html" },
      }
    );

    return errorResponse;
  }
};
