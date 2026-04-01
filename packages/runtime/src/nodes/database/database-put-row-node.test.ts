import type { Node, Schema } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import type { NodeContext } from "../../node-types";
import { DatabasePutRowNode } from "./database-put-row-node";

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
    nodeId: "database-put-row",
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

describe("DatabasePutRowNode", () => {
  const createNode = () =>
    new DatabasePutRowNode({ nodeId: "database-put-row" } as unknown as Node);

  it("should insert a row", async () => {
    const connection = createMockConnection();
    const node = createNode();
    const record = { id: 1, name: "Alice", email: "alice@example.com" };
    const result = await node.execute(
      createContext(
        { database: "db-1", schema: testSchema, record },
        connection
      )
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.success).toBe(true);
    expect(connection.execute).toHaveBeenCalledWith(
      "INSERT OR REPLACE INTO users (id, name, email) VALUES (?, ?, ?)",
      [1, "Alice", "alice@example.com"]
    );
  });

  it("should work with partial record (only PK + some fields)", async () => {
    const connection = createMockConnection();
    const node = createNode();
    const record = { id: 2, name: "Bob" };
    const result = await node.execute(
      createContext(
        { database: "db-1", schema: testSchema, record },
        connection
      )
    );

    expect(result.status).toBe("completed");
    expect(connection.execute).toHaveBeenCalledWith(
      "INSERT OR REPLACE INTO users (id, name) VALUES (?, ?)",
      [2, "Bob"]
    );
  });

  it("should work with string primary key", async () => {
    const stringPkSchema: Schema = {
      name: "items",
      fields: [
        { name: "slug", type: "string", primaryKey: true },
        { name: "title", type: "string" },
      ],
    };
    const connection = createMockConnection();
    const node = createNode();
    const record = { slug: "hello-world", title: "Hello World" };
    const result = await node.execute(
      createContext(
        { database: "db-1", schema: stringPkSchema, record },
        connection
      )
    );

    expect(result.status).toBe("completed");
    expect(connection.execute).toHaveBeenCalledWith(
      "INSERT OR REPLACE INTO items (slug, title) VALUES (?, ?)",
      ["hello-world", "Hello World"]
    );
  });

  it("should return error for missing database", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({ schema: testSchema, record: { id: 1 } })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("'database' is a required input");
  });

  it("should return error for missing schema", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", record: { id: 1 } })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("'schema' is a required input");
  });

  it("should return error for invalid schema structure", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({
        database: "db-1",
        schema: { name: "test" },
        record: { id: 1 },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid schema");
  });

  it("should return error for schema without primary key", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({
        database: "db-1",
        schema: schemaWithoutPk,
        record: { message: "test" },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("no primary key defined");
  });

  it("should return error for missing record", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", schema: testSchema })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("'record' must be an object");
  });

  it("should return error for null record", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", schema: testSchema, record: null })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("'record' must be an object");
  });

  it("should return error for array record", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", schema: testSchema, record: [1, 2] })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("'record' must be an object");
  });

  it("should return error for non-object record", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({
        database: "db-1",
        schema: testSchema,
        record: "not an object",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("'record' must be an object");
  });

  it("should return error when record is missing primary key field", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({
        database: "db-1",
        schema: testSchema,
        record: { name: "Alice", email: "alice@example.com" },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("primary key field 'id'");
  });

  it("should return error when database service is not available", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({
        database: "db-1",
        schema: testSchema,
        record: { id: 1, name: "Alice" },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Database service not available");
  });

  it("should return error when database is not found", async () => {
    const node = createNode();
    const context = {
      nodeId: "database-put-row",
      workflowId: "test-workflow",
      organizationId: "test-org",
      inputs: {
        database: "db-1",
        schema: testSchema,
        record: { id: 1, name: "Alice" },
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
    connection.execute.mockRejectedValue(new Error("table not found"));
    const node = createNode();
    const result = await node.execute(
      createContext(
        {
          database: "db-1",
          schema: testSchema,
          record: { id: 1, name: "Alice" },
        },
        connection
      )
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("table not found");
  });
});
