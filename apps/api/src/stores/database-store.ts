import type { Bindings } from "../context";
import type {
  QueryRequest,
  QueryResponse,
} from "../durable-objects/database-do";

/**
 * Manages connections to Database Durable Objects.
 */
export class DatabaseStore {
  constructor(private env: Pick<Bindings, "DATABASE">) {}

  /**
   * Get Durable Object instance for a database
   * Uses the database handle as the instance ID for routing
   */
  private getInstance(databaseHandle: string): DurableObjectStub {
    const id = this.env.DATABASE.idFromName(databaseHandle);
    return this.env.DATABASE.get(id);
  }

  /**
   * Execute a SELECT query - returns results
   */
  async query(
    databaseHandle: string,
    sql: string,
    params?: unknown[]
  ): Promise<QueryResponse> {
    const stub = this.getInstance(databaseHandle);
    const request: QueryRequest = { sql, params };

    const response = await stub.fetch("http://do/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = (await response.json()) as Record<string, unknown>;
      throw new Error(
        `Database query failed: ${error.error || "Unknown error"}`
      );
    }

    return response.json();
  }

  /**
   * Execute an INSERT/UPDATE/DELETE query - returns metadata
   */
  async execute(
    databaseHandle: string,
    sql: string,
    params?: unknown[]
  ): Promise<QueryResponse> {
    const stub = this.getInstance(databaseHandle);
    const request: QueryRequest = { sql, params };

    const response = await stub.fetch("http://do/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = (await response.json()) as Record<string, unknown>;
      throw new Error(
        `Database execute failed: ${error.error || "Unknown error"}`
      );
    }

    return response.json();
  }
}
