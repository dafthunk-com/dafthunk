import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

/**
 * Consolidated environment interface for Cloudflare Workers
 * This interface defines all environment variables and bindings used across the application
 */
export interface Env {
  // Authentication
  JWT_SECRET: string;

  // Database
  DB?: D1Database;

  // Storage
  BUCKET?: R2Bucket;

  // Allow for additional environment variables
  [key: string]: any;
}
