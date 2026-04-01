import type { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import type { NodeContext } from "../../node-types";
import { DatabaseExecuteNode } from "./database-execute-node";

function createMockConnection() {
  return {
    query: vi.fn(),
    execute: vi.fn().mockResolvedValue({
      results: [],
      meta: { rowsAffected: 1, lastInsertRowid: 42 },
    }),
  };
}

function createContext(
  inputs: Record<string, unknown>,
  connection?: ReturnType<typeof createMockConnection>
): NodeContext {
  return {
    nodeId: "database-execute",
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

describe("DatabaseExecuteNode", () => {
  const createNode = () =>
    new DatabaseExecuteNode({
      nodeId: "database-execute",
    } as unknown as Node);

  it("should execute INSERT and return success, affected, lastRowId", async () => {
    const connection = createMockConnection();
    const node = createNode();
    const result = await node.execute(
      createContext(
        {
          database: "db-1",
          sql: "INSERT INTO users (name) VALUES (?)",
          params: ["Alice"],
        },
        connection
      )
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.success).toBe(true);
    expect(result.outputs?.affected).toBe(1);
    expect(result.outputs?.lastRowId).toBe(42);
    expect(connection.execute).toHaveBeenCalledWith(
      "INSERT INTO users (name) VALUES (?)",
      ["Alice"]
    );
  });

  it("should execute UPDATE and return affected rows", async () => {
    const connection = createMockConnection();
    connection.execute.mockResolvedValue({
      results: [],
      meta: { rowsAffected: 3, lastInsertRowid: null },
    });
    const node = createNode();
    const result = await node.execute(
      createContext(
        {
          database: "db-1",
          sql: "UPDATE users SET active = 1",
        },
        connection
      )
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.success).toBe(true);
    expect(result.outputs?.affected).toBe(3);
    expect(result.outputs?.lastRowId).toBeNull();
  });

  it("should execute DELETE and return affected rows", async () => {
    const connection = createMockConnection();
    connection.execute.mockResolvedValue({
      results: [],
      meta: { rowsAffected: 2, lastInsertRowid: null },
    });
    const node = createNode();
    const result = await node.execute(
      createContext(
        {
          database: "db-1",
          sql: "DELETE FROM users WHERE active = 0",
        },
        connection
      )
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.success).toBe(true);
    expect(result.outputs?.affected).toBe(2);
  });

  it("should reject SELECT queries", async () => {
    const connection = createMockConnection();
    const node = createNode();
    const result = await node.execute(
      createContext(
        { database: "db-1", sql: "SELECT * FROM users" },
        connection
      )
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("SELECT queries are not allowed");
  });

  it("should reject SELECT queries with leading whitespace", async () => {
    const connection = createMockConnection();
    const node = createNode();
    const result = await node.execute(
      createContext(
        { database: "db-1", sql: "  SELECT * FROM users" },
        connection
      )
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("SELECT queries are not allowed");
  });

  it("should handle missing params by defaulting to empty array", async () => {
    const connection = createMockConnection();
    const node = createNode();
    await node.execute(
      createContext({ database: "db-1", sql: "DELETE FROM users" }, connection)
    );

    expect(connection.execute).toHaveBeenCalledWith("DELETE FROM users", []);
  });

  it("should handle non-array params by defaulting to empty array", async () => {
    const connection = createMockConnection();
    const node = createNode();
    await node.execute(
      createContext(
        { database: "db-1", sql: "DELETE FROM users", params: "not-array" },
        connection
      )
    );

    expect(connection.execute).toHaveBeenCalledWith("DELETE FROM users", []);
  });

  it("should handle missing meta by defaulting affected to 0 and lastRowId to null", async () => {
    const connection = createMockConnection();
    connection.execute.mockResolvedValue({ results: [], meta: {} });
    const node = createNode();
    const result = await node.execute(
      createContext(
        { database: "db-1", sql: "INSERT INTO users (name) VALUES ('x')" },
        connection
      )
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.affected).toBe(0);
    expect(result.outputs?.lastRowId).toBeNull();
  });

  it("should return error for missing database", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({ sql: "INSERT INTO users (name) VALUES ('x')" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("'database' is a required input");
  });

  it("should return error for missing sql", async () => {
    const connection = createMockConnection();
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1" }, connection)
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("'sql' is a required input");
  });

  it("should return error when database service is not available", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({
        database: "db-1",
        sql: "INSERT INTO users (name) VALUES ('x')",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Database service not available");
  });

  it("should return error when database is not found", async () => {
    const node = createNode();
    const context = {
      nodeId: "database-execute",
      workflowId: "test-workflow",
      organizationId: "test-org",
      inputs: {
        database: "db-1",
        sql: "INSERT INTO users (name) VALUES ('x')",
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
    connection.execute.mockRejectedValue(new Error("constraint violation"));
    const node = createNode();
    const result = await node.execute(
      createContext(
        {
          database: "db-1",
          sql: "INSERT INTO users (id) VALUES (1)",
        },
        connection
      )
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("constraint violation");
  });
});
