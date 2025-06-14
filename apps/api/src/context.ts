import { JWTTokenPayload } from "@dafthunk/types";

import { RuntimeParams } from "./runtime/runtime";

export interface Bindings {
  DB: D1Database;
  KV: KVNamespace;
  RATE_LIMIT_DEFAULT: RateLimit;
  RATE_LIMIT_AUTH: RateLimit;
  RATE_LIMIT_EXECUTE: RateLimit;
  EXECUTE: Workflow<RuntimeParams>;
  RESSOURCES: R2Bucket;
  DATASETS: R2Bucket;
  DATASETS_AUTORAG: string;
  AI: Ai;
  BROWSER: Fetcher;
  COMPUTE: AnalyticsEngineDataset;
  WEB_HOST: string;
  EMAIL_DOMAIN: string;
  JWT_SECRET: string;
  CLOUDFLARE_ENV: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_AI_GATEWAY_ID?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  SENDGRID_API_KEY?: string;
  SENDGRID_DEFAULT_FROM?: string;
  RESEND_API_KEY?: string;
  RESEND_DEFAULT_FROM?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  SES_DEFAULT_FROM?: string;
}

export interface Variables {
  // JWT payload containing authenticated user data
  jwtPayload?: JWTTokenPayload;
  // Organization ID for the current request context
  organizationId?: string;
}

// Type for Hono app context combining Env and Variables
export type ApiContext = {
  Bindings: Bindings;
  Variables: Variables;
};
