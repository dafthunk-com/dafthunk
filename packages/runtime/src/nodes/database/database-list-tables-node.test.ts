import type { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import type { NodeContext } from "../../node-types";
import { DatabaseListTablesNode } from "./database-list-tables-node";

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
    nodeId: "database-list-tables",
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

describe("DatabaseListTablesNode", () => {
  const createNode = () =>
    new DatabaseListTablesNode({
      nodeId: "database-list-tables",
    } as unknown as Node);

  it("should list tables", async () => {
    const connection = createMockConnection();
    connection.query.mockResolvedValue({
      results: [{ name: "users" }, { name: "posts" }],
    });
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1" }, connection)
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.tables).toEqual(["users", "posts"]);
    expect(connection.query).toHaveBeenCalledWith(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
  });

  it("should return empty array when no tables", async () => {
    const connection = createMockConnection();
    connection.query.mockResolvedValue({ results: [] });
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1" }, connection)
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.tables).toEqual([]);
  });

  it("should return error for missing database", async () => {
    const node = createNode();
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("'database' is a required input");
  });

  it("should return error when database service is not available", async () => {
    const node = createNode();
    const result = await node.execute(createContext({ database: "db-1" }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Database service not available");
  });

  it("should return error when database is not found", async () => {
    const node = createNode();
    const context = {
      nodeId: "database-list-tables",
      workflowId: "test-workflow",
      organizationId: "test-org",
      inputs: { database: "db-1" },
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
      createContext({ database: "db-1" }, connection)
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("connection failed");
  });
});
