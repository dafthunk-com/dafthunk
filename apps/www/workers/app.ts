import { createRequestHandler } from "react-router";

interface Env {
  VITE_API_HOST: string;
  VITE_WEBSITE_URL: string;
  VITE_APP_URL: string;
  VITE_CONTACT_EMAIL: string;
  VITE_GA_MEASUREMENT_ID?: string;
}

declare module "react-router" {
  interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  // @ts-expect-error - virtual module
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

// Report-only so a policy gap degrades to a console warning instead of
// breaking GTM, YouTube, or Turnstile; tighten to enforcing once violations
// are confirmed absent in production.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://challenges.cloudflare.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://i.ytimg.com https://www.googletagmanager.com https://*.google-analytics.com",
  "font-src 'self'",
  "connect-src 'self' https://*.google-analytics.com https://www.googletagmanager.com",
  "frame-src https://www.youtube-nocookie.com https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

const securityHeaders: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), camera=(), microphone=()",
  "Content-Security-Policy-Report-Only": CSP_REPORT_ONLY,
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const response = await requestHandler(request, {
      cloudflare: { env, ctx },
    });
    const withHeaders = new Response(response.body, response);
    for (const [name, value] of Object.entries(securityHeaders)) {
      withHeaders.headers.set(name, value);
    }
    return withHeaders;
  },
} satisfies ExportedHandler<Env>;
