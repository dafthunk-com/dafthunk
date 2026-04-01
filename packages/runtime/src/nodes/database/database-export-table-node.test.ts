import type { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import type { NodeContext } from "../../node-types";
import { DatabaseExportTableNode } from "./database-export-table-node";

function createMockConnection() {
  return {
    query: vi.fn(),
    execute: vi.fn(),
  };
}

function createContext(
  inputs: Record<string, unknown>,
  connection?: ReturnType<typeof createMockConnection>
): NodeContext {
  return {
    nodeId: "database-export-table",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    getIntegration: async () => {
      throw new Error("No integrations in test");
    },
    env: {},
    databaseService: connection
      ? { resolve: vi.fn().mockResolvedValue(connection) }
      : undefined,
  } as unknown as NodeContext;
}

describe("DatabaseExportTableNode", () => {
  const createNode = () =>
    new DatabaseExportTableNode({
      nodeId: "database-export-table",
    } as unknown as Node);

  it("should export schema and data", async () => {
    const connection = createMockConnection();
    // PRAGMA table_info
    connection.query.mockResolvedValueOnce({
      results: [
        {
          cid: 0,
          name: "id",
          type: "INTEGER",
          notnull: 0,
          dflt_value: null,
          pk: 1,
        },
        {
          cid: 1,
          name: "name",
          type: "TEXT",
          notnull: 0,
          dflt_value: null,
          pk: 0,
        },
        {
          cid: 2,
          name: "email",
          type: "TEXT",
          notnull: 0,
          dflt_value: null,
          pk: 0,
        },
      ],
    });
    // SELECT * FROM users
    connection.query.mockResolvedValueOnce({
      results: [
        { id: 1, name: "Alice", email: "alice@example.com" },
        { id: 2, name: "Bob", email: "bob@example.com" },
      ],
    });
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", table: "users" }, connection)
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.schema).toEqual({
      name: "users",
      fields: [
        { name: "id", type: "integer", primaryKey: true },
        { name: "name", type: "string" },
        { name: "email", type: "string" },
      ],
    });
    expect(result.outputs?.data).toEqual([
      { id: 1, name: "Alice", email: "alice@example.com" },
      { id: 2, name: "Bob", email: "bob@example.com" },
    ]);
  });

  it("should return error for non-existent table", async () => {
    const connection = createMockConnection();
    // PRAGMA returns empty results
    connection.query.mockResolvedValueOnce({
      results: [],
    });
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", table: "nonexistent" }, connection)
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Table 'nonexistent' not found");
  });

  it("should reject invalid table name", async () => {
    const connection = createMockConnection();
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", table: "my table" }, connection)
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid table name");
  });

  it("should return error for missing database", async () => {
    const node = createNode();
    const result = await node.execute(createContext({ table: "users" }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("'database' is a required input");
  });

  it("should return error for missing table", async () => {
    const node = createNode();
    const result = await node.execute(createContext({ database: "db-1" }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("'table' is a required input");
  });

  it("should return error when database service is not available", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", table: "users" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Database service not available");
  });

  it("should return error when database is not found", async () => {
    const node = createNode();
    const context = {
      nodeId: "database-export-table",
      workflowId: "test-workflow",
      organizationId: "test-org",
      inputs: { database: "db-1", table: "users" },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
      databaseService: { resolve: vi.fn().mockResolvedValue(null) },
    } as unknown as NodeContext;

    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("not found or does not belong");
  });

  it("should return error when query throws", async () => {
    const connection = createMockConnection();
    connection.query.mockRejectedValue(new Error("connection failed"));
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", table: "users" }, connection)
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("connection failed");
  });
});
