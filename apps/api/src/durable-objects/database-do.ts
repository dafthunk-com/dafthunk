/**
 * Database Durable Object
 *
 * Provides persistent SQLite database storage for workflows.
 * Each database instance is a separate Durable Object with isolated storage.
 */

import { DurableObject } from "cloudflare:workers";

import type { Bindings } from "../context";

export interface QueryRequest {
  sql: string;
  params?: unknown[];
}

export interface QueryResponse {
  results: unknown[];
  meta?: {
    rowsAffected?: number;
    lastInsertRowid?: number;
  };
}

export class DatabaseDO extends DurableObject<Bindings> {
  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Route to appropriate handler
    if (url.pathname.endsWith("/query") && request.method === "POST") {
      return this.handleQuery(request);
    }

    if (url.pathname.endsWith("/execute") && request.method === "POST") {
      return this.handleExecute(request);
    }

    return new Response("Not found", { status: 404 });
  }

  /**
   * Handle SELECT queries - returns result rows
   */
  private async handleQuery(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as QueryRequest;
      const { sql, params = [] } = body;

      // Use Durable Object SQL API
      const results = await this.ctx.storage.sql.exec(sql, ...params);

      return Response.json({
        results: results.toArray(),
      } as QueryResponse);
    } catch (error) {
      console.error("Error executing query:", error);
      return Response.json(
        {
          error: "Failed to execute query",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  }

  /**
   * Handle INSERT/UPDATE/DELETE queries - returns metadata
   */
  private async handleExecute(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as QueryRequest;
      const { sql, params = [] } = body;

      // Use Durable Object SQL API
      const result = await this.ctx.storage.sql.exec(sql, ...params);

      return Response.json({
        results: [],
        meta: {
          rowsAffected: result.rowsWritten,
          lastInsertRowid: result.lastRowId,
        },
      } as QueryResponse);
    } catch (error) {
      console.error("Error executing command:", error);
      return Response.json(
        {
          error: "Failed to execute command",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  }
}
