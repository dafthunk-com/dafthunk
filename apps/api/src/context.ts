import type { RuntimeParams } from "@dafthunk/runtime";
import { JWTTokenPayload } from "@dafthunk/types";
import { DatabaseDO } from "./durable-objects/database-do";
import { Session } from "./session/session";

export interface Bindings {
  DB: D1Database;
  KV: KVNamespace;
  RATE_LIMIT_DEFAULT: RateLimit;
  RATE_LIMIT_AUTH: RateLimit;
  RATE_LIMIT_EXECUTE: RateLimit;
  EXECUTE: Workflow<RuntimeParams>;
  WORKFLOW_SESSION: DurableObjectNamespace<Session>;
  DATABASE: DurableObjectNamespace<DatabaseDO>;
  WORKFLOW_QUEUE: Queue;
  RESSOURCES: R2Bucket;
  DATASETS: R2Bucket;
  DATASETS_AUTORAG: string;
  AI: Ai;
  AI_OPTIONS: AiOptions;
  BROWSER?: Fetcher;
  EXECUTIONS: AnalyticsEngineDataset;
  WEB_HOST: string;
  WEBSITE_URL: string;
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
  INTEGRATION_GOOGLE_MAIL_CLIENT_ID?: string;
  INTEGRATION_GOOGLE_MAIL_CLIENT_SECRET?: string;
  INTEGRATION_GOOGLE_CALENDAR_CLIENT_ID?: string;
  INTEGRATION_GOOGLE_CALENDAR_CLIENT_SECRET?: string;
  INTEGRATION_DISCORD_CLIENT_ID?: string;
  INTEGRATION_DISCORD_CLIENT_SECRET?: string;
  INTEGRATION_GITHUB_CLIENT_ID?: string;
  INTEGRATION_GITHUB_CLIENT_SECRET?: string;
  INTEGRATION_REDDIT_CLIENT_ID?: string;
  INTEGRATION_REDDIT_CLIENT_SECRET?: string;
  INTEGRATION_LINKEDIN_CLIENT_ID?: string;
  INTEGRATION_LINKEDIN_CLIENT_SECRET?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  SES_DEFAULT_FROM?: string;
  HUGGINGFACE_API_KEY?: string;
  REPLICATE_API_TOKEN?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  SECRET_MASTER_KEY: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID_PRO?: string;
  STRIPE_METER_ID?: string;
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
