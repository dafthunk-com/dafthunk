import type { Node, Schema } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import type { NodeContext } from "../../node-types";
import { DatabaseImportTableNode } from "./database-import-table-node";

const testSchema: Schema = {
  name: "users",
  fields: [
    { name: "id", type: "integer", primaryKey: true },
    { name: "name", type: "string" },
    { name: "email", type: "string" },
  ],
};

function createMockConnection() {
  return {
    query: vi.fn(),
    execute: vi.fn().mockResolvedValue({
      results: [],
      meta: { rowsAffected: 1 },
    }),
  };
}

function createContext(
  inputs: Record<string, unknown>,
  connection?: ReturnType<typeof createMockConnection>
): NodeContext {
  return {
    nodeId: "database-import-table",
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

describe("DatabaseImportTableNode", () => {
  const createNode = () =>
    new DatabaseImportTableNode({
      nodeId: "database-import-table",
    } as unknown as Node);

  it("should create table and insert data when table does not exist (mode=append)", async () => {
    const connection = createMockConnection();
    // Table does not exist
    connection.query.mockResolvedValueOnce({ results: [] });
    const node = createNode();
    const data = [
      { id: 1, name: "Alice", email: "alice@example.com" },
      { id: 2, name: "Bob", email: "bob@example.com" },
    ];
    const result = await node.execute(
      createContext(
        { database: "db-1", schema: testSchema, data, mode: "append" },
        connection
      )
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.created).toBe(true);
    expect(result.outputs?.inserted).toBe(2);
    // Should have called execute for CREATE TABLE + 2 INSERTs
    expect(connection.execute).toHaveBeenCalledTimes(3);
  });

  it("should append to existing table (mode=append)", async () => {
    const connection = createMockConnection();
    // Table exists
    connection.query.mockResolvedValueOnce({
      results: [{ name: "users" }],
    });
    const node = createNode();
    const data = [{ id: 3, name: "Charlie", email: "charlie@example.com" }];
    const result = await node.execute(
      createContext(
        { database: "db-1", schema: testSchema, data, mode: "append" },
        connection
      )
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.created).toBe(false);
    expect(result.outputs?.inserted).toBe(1);
    // Should only call execute for INSERT (no CREATE TABLE)
    expect(connection.execute).toHaveBeenCalledTimes(1);
  });

  it("should replace existing table (mode=replace)", async () => {
    const connection = createMockConnection();
    // Table exists
    connection.query.mockResolvedValueOnce({
      results: [{ name: "users" }],
    });
    const node = createNode();
    const data = [{ id: 1, name: "Alice", email: "alice@example.com" }];
    const result = await node.execute(
      createContext(
        { database: "db-1", schema: testSchema, data, mode: "replace" },
        connection
      )
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.created).toBe(false);
    expect(result.outputs?.inserted).toBe(1);
    // Should call execute for DROP TABLE + CREATE TABLE + INSERT
    expect(connection.execute).toHaveBeenCalledTimes(3);
  });

  it("should return error for invalid mode", async () => {
    const connection = createMockConnection();
    const node = createNode();
    const result = await node.execute(
      createContext(
        {
          database: "db-1",
          schema: testSchema,
          data: [{ id: 1, name: "Alice", email: "a@b.com" }],
          mode: "invalid",
        },
        connection
      )
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid mode");
  });

  it("should handle empty data array", async () => {
    const connection = createMockConnection();
    // Table does not exist
    connection.query.mockResolvedValueOnce({ results: [] });
    const node = createNode();
    const result = await node.execute(
      createContext(
        { database: "db-1", schema: testSchema, data: [], mode: "append" },
        connection
      )
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.created).toBe(true);
    expect(result.outputs?.inserted).toBe(0);
  });

  it("should return error for missing database", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({ schema: testSchema, data: [{ id: 1 }] })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("'database' is a required input");
  });

  it("should return error for missing schema", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", data: [{ id: 1 }] })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("'schema' is a required input");
  });

  it("should return error for schema without name", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({
        database: "db-1",
        schema: { fields: [{ name: "id", type: "integer" }] },
        data: [{ id: 1 }],
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid schema");
  });

  it("should return error for schema without fields", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({
        database: "db-1",
        schema: { name: "users" },
        data: [{ id: 1 }],
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid schema");
  });

  it("should return error for schema with empty fields array", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({
        database: "db-1",
        schema: { name: "users", fields: [] },
        data: [{ id: 1 }],
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("'fields' array cannot be empty");
  });

  it("should return error for missing data", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", schema: testSchema })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("'data' must be an array");
  });

  it("should return error for non-array data", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({
        database: "db-1",
        schema: testSchema,
        data: "not an array",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("'data' must be an array");
  });

  it("should return error when database service is not available", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({
        database: "db-1",
        schema: testSchema,
        data: [{ id: 1, name: "Alice", email: "a@b.com" }],
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Database service not available");
  });

  it("should return error when database is not found", async () => {
    const node = createNode();
    const context = {
      nodeId: "database-import-table",
      workflowId: "test-workflow",
      organizationId: "test-org",
      inputs: {
        database: "db-1",
        schema: testSchema,
        data: [{ id: 1, name: "Alice", email: "a@b.com" }],
      },
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

  it("should return error when execute throws", async () => {
    const connection = createMockConnection();
    // Table does not exist
    connection.query.mockResolvedValueOnce({ results: [] });
    connection.execute.mockRejectedValue(new Error("disk full"));
    const node = createNode();
    const result = await node.execute(
      createContext(
        {
          database: "db-1",
          schema: testSchema,
          data: [{ id: 1, name: "Alice", email: "a@b.com" }],
        },
        connection
      )
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("disk full");
  });
});
