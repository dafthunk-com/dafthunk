import { Workflow } from "@cloudflare/workers-types";
import { Fetcher } from "@cloudflare/workers-types";
import { CustomJWTPayload } from "@dafthunk/types";
import { JWTPayload } from "jose";

import { RuntimeParams } from "./runtime/runtime";

export interface Bindings {
  DB: D1Database;
  EXECUTE: Workflow<RuntimeParams>;
  BUCKET: R2Bucket;
  AI: Ai;
  KV: KVNamespace;
  WEB_HOST: string;
  EMAIL_DOMAIN: string;
  JWT_SECRET: string;
  CLOUDFLARE_ENV: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;
  SENDGRID_API_KEY: string;
  SENDGRID_DEFAULT_FROM: string;
  RESEND_API_KEY: string;
  RESEND_DEFAULT_FROM: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  SES_DEFAULT_FROM: string;
  BROWSER: Fetcher | null;
}

export interface Variables {
  jwtPayload?: CustomJWTPayload & JWTPayload;
  organizationId?: string;
}

// Type for Hono app context combining Env and Variables
export type ApiContext = {
  Bindings: Bindings;
  Variables: Variables;
};
