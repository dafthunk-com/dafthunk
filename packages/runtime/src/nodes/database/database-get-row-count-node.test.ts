import type { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import type { NodeContext } from "../../node-types";
import { DatabaseGetRowCountNode } from "./database-get-row-count-node";

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
    nodeId: "database-get-row-count",
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

describe("DatabaseGetRowCountNode", () => {
  const createNode = () =>
    new DatabaseGetRowCountNode({
      nodeId: "database-get-row-count",
    } as unknown as Node);

  it("should return the row count", async () => {
    const connection = createMockConnection();
    // First call: table exists check
    connection.query.mockResolvedValueOnce({
      results: [{ name: "users" }],
    });
    // Second call: COUNT(*)
    connection.query.mockResolvedValueOnce({
      results: [{ count: 42 }],
    });
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", table: "users" }, connection)
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.count).toBe(42);
  });

  it("should return 0 for empty table", async () => {
    const connection = createMockConnection();
    connection.query.mockResolvedValueOnce({
      results: [{ name: "users" }],
    });
    connection.query.mockResolvedValueOnce({
      results: [{ count: 0 }],
    });
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", table: "users" }, connection)
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.count).toBe(0);
  });

  it("should return error for non-existent table", async () => {
    const connection = createMockConnection();
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
    // Table exists check passes
    connection.query.mockResolvedValueOnce({
      results: [{ name: "my table" }],
    });
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
      nodeId: "database-get-row-count",
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
