import type { D1Database } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/d1";
import { type DrizzleD1Database } from "drizzle-orm/d1";

import * as schema from "./schema";

export type Database = DrizzleD1Database<typeof schema>;

export function createDatabase(d1: D1Database): Database {
  return drizzle(d1, { schema });
}

// Re-export schema
export * from "./queries";
export * from "./schema";
