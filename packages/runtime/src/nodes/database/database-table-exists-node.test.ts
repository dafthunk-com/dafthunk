import type { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import type { NodeContext } from "../../node-types";
import { DatabaseTableExistsNode } from "./database-table-exists-node";

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
    nodeId: "database-table-exists",
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

describe("DatabaseTableExistsNode", () => {
  const createNode = () =>
    new DatabaseTableExistsNode({
      nodeId: "database-table-exists",
    } as unknown as Node);

  it("should return exists=true when table exists", async () => {
    const connection = createMockConnection();
    connection.query.mockResolvedValue({
      results: [{ name: "users" }],
    });
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", table: "users" }, connection)
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.exists).toBe(true);
    expect(connection.query).toHaveBeenCalledWith(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      ["users"]
    );
  });

  it("should return exists=false when table does not exist", async () => {
    const connection = createMockConnection();
    connection.query.mockResolvedValue({
      results: [],
    });
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", table: "nonexistent" }, connection)
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.exists).toBe(false);
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

  it("should reject table name with special characters", async () => {
    const connection = createMockConnection();
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", table: "users;DROP" }, connection)
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
      nodeId: "database-table-exists",
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
