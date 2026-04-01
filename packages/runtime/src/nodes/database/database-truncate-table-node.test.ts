import type { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import type { NodeContext } from "../../node-types";
import { DatabaseTruncateTableNode } from "./database-truncate-table-node";

function createMockConnection() {
  return {
    query: vi.fn().mockResolvedValue({
      results: [{ name: "users" }],
    }),
    execute: vi.fn().mockResolvedValue({
      results: [],
      meta: { rowsAffected: 5 },
    }),
  };
}

function createContext(
  inputs: Record<string, unknown>,
  connection?: ReturnType<typeof createMockConnection>
): NodeContext {
  return {
    nodeId: "database-truncate-table",
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

describe("DatabaseTruncateTableNode", () => {
  const createNode = () =>
    new DatabaseTruncateTableNode({
      nodeId: "database-truncate-table",
    } as unknown as Node);

  it("should truncate a table and return deleted count", async () => {
    const connection = createMockConnection();
    connection.query.mockResolvedValue({
      results: [{ name: "users" }],
    });
    connection.execute.mockResolvedValue({
      results: [],
      meta: { rowsAffected: 10 },
    });
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", table: "users" }, connection)
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.success).toBe(true);
    expect(result.outputs?.deleted).toBe(10);
    expect(connection.query).toHaveBeenCalledWith(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      ["users"]
    );
    expect(connection.execute).toHaveBeenCalledWith("DELETE FROM users");
  });

  it("should return error for non-existent table", async () => {
    const connection = createMockConnection();
    connection.query.mockResolvedValue({ results: [] });
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", table: "nonexistent" }, connection)
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Table 'nonexistent' not found");
  });

  it("should reject invalid table name", async () => {
    const connection = createMockConnection();
    connection.query.mockResolvedValue({
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
      nodeId: "database-truncate-table",
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

  it("should return error when execute throws", async () => {
    const connection = createMockConnection();
    connection.query.mockResolvedValue({
      results: [{ name: "users" }],
    });
    connection.execute.mockRejectedValue(new Error("disk full"));
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", table: "users" }, connection)
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("disk full");
  });
});
