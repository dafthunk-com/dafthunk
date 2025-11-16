export interface Env {
  ASSETS: Fetcher;
  VITE_API_HOST?: string;
  VITE_WEBSITE_URL?: string;
  VITE_APP_URL?: string;
  VITE_CONTACT_EMAIL?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // For SPA routing, serve index.html for non-asset requests
    const assetPattern =
      /\.(js|css|svg|png|jpg|jpeg|gif|ico|webmanifest|map|txt|json|mp3|mp4|webm|wav|ogg)$/i;

    if (
      assetPattern.test(url.pathname) ||
      url.pathname.startsWith("/assets/")
    ) {
      // Serve static assets directly
      return env.ASSETS.fetch(request);
    }

    // For all other routes (SPA routes), serve index.html
    const indexUrl = new URL("/index.html", request.url);
    return env.ASSETS.fetch(indexUrl.toString());
  },
};
