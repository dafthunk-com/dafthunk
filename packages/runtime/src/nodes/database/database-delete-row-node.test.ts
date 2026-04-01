import type { Node, Schema } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import type { NodeContext } from "../../node-types";
import { DatabaseDeleteRowNode } from "./database-delete-row-node";

const testSchema: Schema = {
  name: "users",
  fields: [
    { name: "id", type: "integer", primaryKey: true },
    { name: "name", type: "string" },
    { name: "email", type: "string" },
  ],
};

const schemaWithoutPk: Schema = {
  name: "logs",
  fields: [
    { name: "message", type: "string" },
    { name: "level", type: "string" },
  ],
};

function createMockConnection(rowsAffected: number) {
  return {
    query: vi.fn(),
    execute: vi.fn().mockResolvedValue({
      results: [],
      meta: { rowsAffected },
    }),
  };
}

function createContext(
  inputs: Record<string, unknown>,
  connection?: ReturnType<typeof createMockConnection>
): NodeContext {
  return {
    nodeId: "database-delete-row",
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

describe("DatabaseDeleteRowNode", () => {
  const createNode = () =>
    new DatabaseDeleteRowNode({
      nodeId: "database-delete-row",
    } as unknown as Node);

  it("should delete a row and return deleted = 1", async () => {
    const connection = createMockConnection(1);
    const node = createNode();
    const result = await node.execute(
      createContext(
        { database: "db-1", schema: testSchema, key: 1 },
        connection
      )
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.success).toBe(true);
    expect(result.outputs?.deleted).toBe(1);
    expect(connection.execute).toHaveBeenCalledWith(
      "DELETE FROM users WHERE id = ?",
      [1]
    );
  });

  it("should return deleted = 0 when row does not exist", async () => {
    const connection = createMockConnection(0);
    const node = createNode();
    const result = await node.execute(
      createContext(
        { database: "db-1", schema: testSchema, key: 999 },
        connection
      )
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.success).toBe(true);
    expect(result.outputs?.deleted).toBe(0);
  });

  it("should work with string primary key", async () => {
    const stringPkSchema: Schema = {
      name: "items",
      fields: [
        { name: "slug", type: "string", primaryKey: true },
        { name: "title", type: "string" },
      ],
    };
    const connection = createMockConnection(1);
    const node = createNode();
    const result = await node.execute(
      createContext(
        { database: "db-1", schema: stringPkSchema, key: "hello-world" },
        connection
      )
    );

    expect(result.status).toBe("completed");
    expect(connection.execute).toHaveBeenCalledWith(
      "DELETE FROM items WHERE slug = ?",
      ["hello-world"]
    );
  });

  it("should return error for missing database", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({ schema: testSchema, key: 1 })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("'database' is a required input");
  });

  it("should return error for missing schema", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", key: 1 })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("'schema' is a required input");
  });

  it("should return error for invalid schema structure", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", schema: { name: "test" }, key: 1 })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid schema");
  });

  it("should return error for schema without primary key", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", schema: schemaWithoutPk, key: 1 })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("no primary key defined");
  });

  it("should return error for missing key", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", schema: testSchema })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("'key' is a required input");
  });

  it("should return error for null key", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", schema: testSchema, key: null })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("'key' is a required input");
  });

  it("should return error when database service is not available", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", schema: testSchema, key: 1 })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Database service not available");
  });

  it("should return error when database is not found", async () => {
    const node = createNode();
    const context = {
      nodeId: "database-delete-row",
      workflowId: "test-workflow",
      organizationId: "test-org",
      inputs: { database: "db-1", schema: testSchema, key: 1 },
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
    const connection = createMockConnection(0);
    connection.execute.mockRejectedValue(new Error("table not found"));
    const node = createNode();
    const result = await node.execute(
      createContext(
        { database: "db-1", schema: testSchema, key: 1 },
        connection
      )
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("table not found");
  });
});
