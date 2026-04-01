import type { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import type { NodeContext } from "../../node-types";
import { DatabaseQueryNode } from "./database-query-node";

function createMockConnection() {
  return {
    query: vi.fn().mockResolvedValue({
      results: [],
    }),
    execute: vi.fn(),
  };
}

function createContext(
  inputs: Record<string, unknown>,
  connection?: ReturnType<typeof createMockConnection>
): NodeContext {
  return {
    nodeId: "database-query",
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

describe("DatabaseQueryNode", () => {
  const createNode = () =>
    new DatabaseQueryNode({ nodeId: "database-query" } as unknown as Node);

  it("should execute a SELECT query and return results and count", async () => {
    const connection = createMockConnection();
    const rows = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];
    connection.query.mockResolvedValue({ results: rows });
    const node = createNode();
    const result = await node.execute(
      createContext(
        { database: "db-1", sql: "SELECT * FROM users" },
        connection
      )
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.results).toEqual(rows);
    expect(result.outputs?.count).toBe(2);
    expect(connection.query).toHaveBeenCalledWith("SELECT * FROM users", []);
  });

  it("should handle empty results", async () => {
    const connection = createMockConnection();
    connection.query.mockResolvedValue({ results: [] });
    const node = createNode();
    const result = await node.execute(
      createContext(
        { database: "db-1", sql: "SELECT * FROM users WHERE id = 999" },
        connection
      )
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.results).toEqual([]);
    expect(result.outputs?.count).toBe(0);
  });

  it("should pass query params", async () => {
    const connection = createMockConnection();
    connection.query.mockResolvedValue({
      results: [{ id: 1, name: "Alice" }],
    });
    const node = createNode();
    const result = await node.execute(
      createContext(
        {
          database: "db-1",
          sql: "SELECT * FROM users WHERE id = ?",
          params: [1],
        },
        connection
      )
    );

    expect(result.status).toBe("completed");
    expect(connection.query).toHaveBeenCalledWith(
      "SELECT * FROM users WHERE id = ?",
      [1]
    );
  });

  it("should default params to empty array when not provided", async () => {
    const connection = createMockConnection();
    connection.query.mockResolvedValue({ results: [] });
    const node = createNode();
    await node.execute(
      createContext({ database: "db-1", sql: "SELECT 1" }, connection)
    );

    expect(connection.query).toHaveBeenCalledWith("SELECT 1", []);
  });

  it("should default params to empty array when params is not an array", async () => {
    const connection = createMockConnection();
    connection.query.mockResolvedValue({ results: [] });
    const node = createNode();
    await node.execute(
      createContext(
        { database: "db-1", sql: "SELECT 1", params: "not-array" },
        connection
      )
    );

    expect(connection.query).toHaveBeenCalledWith("SELECT 1", []);
  });

  it("should reject non-SELECT queries", async () => {
    const node = createNode();
    const connection = createMockConnection();

    const insertResult = await node.execute(
      createContext(
        { database: "db-1", sql: "INSERT INTO users VALUES (1)" },
        connection
      )
    );
    expect(insertResult.status).toBe("error");
    expect(insertResult.error).toContain("Only SELECT queries are allowed");

    const updateResult = await node.execute(
      createContext(
        { database: "db-1", sql: "UPDATE users SET name = 'x'" },
        connection
      )
    );
    expect(updateResult.status).toBe("error");
    expect(updateResult.error).toContain("Only SELECT queries are allowed");

    const deleteResult = await node.execute(
      createContext({ database: "db-1", sql: "DELETE FROM users" }, connection)
    );
    expect(deleteResult.status).toBe("error");
    expect(deleteResult.error).toContain("Only SELECT queries are allowed");
  });

  it("should reject non-SELECT queries with leading whitespace", async () => {
    const node = createNode();
    const connection = createMockConnection();
    const result = await node.execute(
      createContext(
        { database: "db-1", sql: "  INSERT INTO users VALUES (1)" },
        connection
      )
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Only SELECT queries are allowed");
  });

  it("should handle schema validation when schema input is provided", async () => {
    const connection = createMockConnection();
    connection.query.mockResolvedValue({
      results: [{ id: 1, name: "Alice" }],
    });
    const schema = {
      name: "users",
      fields: [
        { name: "id", type: "integer" },
        { name: "name", type: "string" },
      ],
    };
    const node = createNode();
    const result = await node.execute(
      createContext(
        { database: "db-1", sql: "SELECT * FROM users", schema },
        connection
      )
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.results).toBeDefined();
    expect(result.outputs?.count).toBeDefined();
  });

  it("should return error for missing database", async () => {
    const node = createNode();
    const result = await node.execute(createContext({ sql: "SELECT 1" }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("'database' is a required input");
  });

  it("should return error for missing sql", async () => {
    const node = createNode();
    const connection = createMockConnection();
    const result = await node.execute(
      createContext({ database: "db-1" }, connection)
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("'sql' is a required input");
  });

  it("should return error when database service is not available", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", sql: "SELECT 1" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Database service not available");
  });

  it("should return error when database is not found", async () => {
    const node = createNode();
    const context = {
      nodeId: "database-query",
      workflowId: "test-workflow",
      organizationId: "test-org",
      inputs: { database: "db-1", sql: "SELECT 1" },
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
    connection.query.mockRejectedValue(new Error("syntax error"));
    const node = createNode();
    const result = await node.execute(
      createContext(
        { database: "db-1", sql: "SELECT * FROM nonexistent" },
        connection
      )
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("syntax error");
  });
});
