import type {
  DatabaseConnection,
  DatabaseService,
  QueryResult,
} from "@dafthunk/runtime";

import type { Bindings } from "../context";
import { createDatabase, getDatabase } from "../db";
import type { QueryRequest } from "../durable-objects/database-do";

/**
 * Sends a request to a Database Durable Object and returns the parsed response.
 */
async function doDurableObjectRequest(
  stub: DurableObjectStub,
  path: string,
  request: QueryRequest
): Promise<QueryResult> {
  const response = await stub.fetch(`http://do${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = (await response.json()) as Record<string, unknown>;
    throw new Error(
      `Database ${path.slice(1)} failed: ${error.error || "Unknown error"}`
    );
  }

  return response.json();
}

/**
 * DatabaseConnection backed by a Cloudflare Durable Object.
 * Pre-bound to a specific database handle after ownership verification.
 */
class CloudflareDatabaseConnection implements DatabaseConnection {
  private stub: DurableObjectStub;

  constructor(stub: DurableObjectStub) {
    this.stub = stub;
  }

  async query(sql: string, params?: unknown[]): Promise<QueryResult> {
    return doDurableObjectRequest(this.stub, "/query", { sql, params });
  }

  async execute(sql: string, params?: unknown[]): Promise<QueryResult> {
    return doDurableObjectRequest(this.stub, "/execute", { sql, params });
  }
}

/**
 * Cloudflare-backed DatabaseService.
 * Verifies database ownership via D1, then returns a connection
 * routed through a Database Durable Object.
 */
export class CloudflareDatabaseService implements DatabaseService {
  constructor(private env: Pick<Bindings, "DB" | "DATABASE">) {}

  async resolve(
    databaseIdOrHandle: string,
    organizationId: string
  ): Promise<DatabaseConnection | undefined> {
    const db = createDatabase(this.env.DB);
    const database = await getDatabase(db, databaseIdOrHandle, organizationId);

    if (!database) return undefined;

    const id = this.env.DATABASE.idFromName(database.handle);
    const stub: DurableObjectStub = this.env.DATABASE.get(id);
    return new CloudflareDatabaseConnection(stub);
  }
}
