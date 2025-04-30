import { JWTPayload } from "jose";
import { RuntimeParams } from "./runtime/runtime";
import { Workflow } from "@cloudflare/workers-types";

export interface CustomJWTPayload extends JWTPayload {
  sub: string;
  name: string;
  email?: string;
  provider: string;
  avatarUrl?: string;
  plan: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface Bindings {
  DB: D1Database;
  EXECUTE: Workflow<RuntimeParams>;
  BUCKET: R2Bucket;
  AI: Ai;
  KV: KVNamespace;
  WEB_HOST: string;
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
}

export interface Variables {
  jwtPayload?: CustomJWTPayload;
}

// Type for Hono app context combining Env and Variables
export type ApiContext = {
  Bindings: Bindings;
  Variables: Variables;
};
