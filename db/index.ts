import { drizzle } from "drizzle-orm/d1";
import { type DrizzleD1Database } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";
import * as schema from "./schema";

export type Database = DrizzleD1Database<typeof schema>;

export function createDatabase(d1: D1Database): Database {
  return drizzle(d1, { schema });
}

// Helper types for Cloudflare environment bindings
export interface Env {
  DB: D1Database;
}

// Re-export schema
export * from "./schema";
