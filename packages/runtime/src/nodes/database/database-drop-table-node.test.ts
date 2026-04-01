import type { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import type { NodeContext } from "../../node-types";
import { DatabaseDropTableNode } from "./database-drop-table-node";

function createMockConnection() {
  return {
    query: vi.fn(),
    execute: vi.fn().mockResolvedValue({
      results: [],
      meta: { rowsAffected: 0 },
    }),
  };
}

function createContext(
  inputs: Record<string, unknown>,
  connection?: ReturnType<typeof createMockConnection>
): NodeContext {
  return {
    nodeId: "database-drop-table",
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

describe("DatabaseDropTableNode", () => {
  const createNode = () =>
    new DatabaseDropTableNode({
      nodeId: "database-drop-table",
    } as unknown as Node);

  it("should drop a table successfully", async () => {
    const connection = createMockConnection();
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", table: "users" }, connection)
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.success).toBe(true);
    expect(connection.execute).toHaveBeenCalledWith(
      "DROP TABLE IF EXISTS users"
    );
  });

  it("should reject invalid table name", async () => {
    const connection = createMockConnection();
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", table: "drop; --" }, connection)
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
      nodeId: "database-drop-table",
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
    connection.execute.mockRejectedValue(new Error("table locked"));
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", table: "users" }, connection)
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("table locked");
  });
});
