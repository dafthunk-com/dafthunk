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

export default {
  // biome-ignore lint/suspicious/useAwait: this is expected
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<Env>;
