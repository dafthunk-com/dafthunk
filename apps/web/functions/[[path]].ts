import { render } from "../src/entry-server";

interface Env {
  ASSETS: Fetcher;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
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
};
