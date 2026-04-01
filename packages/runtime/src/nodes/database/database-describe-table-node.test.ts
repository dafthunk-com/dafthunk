import type { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import type { NodeContext } from "../../node-types";
import { DatabaseDescribeTableNode } from "./database-describe-table-node";

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
    nodeId: "database-describe-table",
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

describe("DatabaseDescribeTableNode", () => {
  const createNode = () =>
    new DatabaseDescribeTableNode({
      nodeId: "database-describe-table",
    } as unknown as Node);

  it("should return schema with fields", async () => {
    const connection = createMockConnection();
    connection.query.mockResolvedValue({
      results: [
        {
          cid: 0,
          name: "id",
          type: "INTEGER",
          notnull: 1,
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
          name: "score",
          type: "REAL",
          notnull: 0,
          dflt_value: null,
          pk: 0,
        },
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
        { name: "score", type: "number" },
      ],
    });
    expect(connection.query).toHaveBeenCalledWith("PRAGMA table_info(users)");
  });

  it("should map primary key correctly", async () => {
    const connection = createMockConnection();
    connection.query.mockResolvedValue({
      results: [
        {
          cid: 0,
          name: "slug",
          type: "TEXT",
          notnull: 0,
          dflt_value: null,
          pk: 1,
        },
        {
          cid: 1,
          name: "title",
          type: "TEXT",
          notnull: 0,
          dflt_value: null,
          pk: 0,
        },
      ],
    });
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", table: "posts" }, connection)
    );

    expect(result.status).toBe("completed");
    const schema = result.outputs?.schema as {
      fields: Array<{ name: string; primaryKey?: boolean }>;
    };
    expect(schema.fields[0].primaryKey).toBe(true);
    expect(schema.fields[1].primaryKey).toBeUndefined();
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
      results: [
        {
          cid: 0,
          name: "id",
          type: "INTEGER",
          notnull: 0,
          dflt_value: null,
          pk: 1,
        },
      ],
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
      nodeId: "database-describe-table",
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
    connection.query.mockRejectedValue(new Error("permission denied"));
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", table: "users" }, connection)
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("permission denied");
  });
});
