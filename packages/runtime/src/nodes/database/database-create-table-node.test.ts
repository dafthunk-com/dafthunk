import type { Node, Schema } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import type { NodeContext } from "../../node-types";
import { DatabaseCreateTableNode } from "./database-create-table-node";

const testSchema: Schema = {
  name: "users",
  fields: [
    { name: "id", type: "integer", primaryKey: true },
    { name: "name", type: "string" },
    { name: "email", type: "string" },
  ],
};

function createMockConnection() {
  return {
    query: vi.fn().mockResolvedValue({ results: [] }),
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
    nodeId: "database-create-table",
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

describe("DatabaseCreateTableNode", () => {
  const createNode = () =>
    new DatabaseCreateTableNode({
      nodeId: "database-create-table",
    } as unknown as Node);

  it("should create a table when it does not exist", async () => {
    const connection = createMockConnection();
    connection.query.mockResolvedValue({ results: [] });
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", schema: testSchema }, connection)
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.created).toBe(true);
    expect(connection.query).toHaveBeenCalled();
    expect(connection.execute).toHaveBeenCalled();
  });

  it("should return created=false when table already exists", async () => {
    const connection = createMockConnection();
    connection.query.mockResolvedValue({
      results: [{ name: "users" }],
    });
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", schema: testSchema }, connection)
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.created).toBe(false);
    expect(connection.execute).not.toHaveBeenCalled();
  });

  it("should return error for missing database", async () => {
    const node = createNode();
    const result = await node.execute(createContext({ schema: testSchema }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("'database' is a required input");
  });

  it("should return error for missing schema", async () => {
    const node = createNode();
    const connection = createMockConnection();
    const result = await node.execute(
      createContext({ database: "db-1" }, connection)
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("'schema' is a required input");
  });

  it("should return error for schema without name", async () => {
    const node = createNode();
    const connection = createMockConnection();
    const result = await node.execute(
      createContext(
        {
          database: "db-1",
          schema: {
            fields: [{ name: "id", type: "integer" }],
          },
        },
        connection
      )
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid schema");
  });

  it("should return error for schema without fields", async () => {
    const node = createNode();
    const connection = createMockConnection();
    const result = await node.execute(
      createContext(
        {
          database: "db-1",
          schema: { name: "test" },
        },
        connection
      )
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid schema");
  });

  it("should return error for schema with empty fields array", async () => {
    const node = createNode();
    const connection = createMockConnection();
    const result = await node.execute(
      createContext(
        {
          database: "db-1",
          schema: { name: "test", fields: [] },
        },
        connection
      )
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("'fields' array cannot be empty");
  });

  it("should return error when database service is not available", async () => {
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", schema: testSchema })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Database service not available");
  });

  it("should return error when database is not found", async () => {
    const node = createNode();
    const context = {
      nodeId: "database-create-table",
      workflowId: "test-workflow",
      organizationId: "test-org",
      inputs: { database: "db-1", schema: testSchema },
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
    connection.query.mockResolvedValue({ results: [] });
    connection.execute.mockRejectedValue(new Error("disk full"));
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", schema: testSchema }, connection)
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("disk full");
  });

  it("should return error when query throws during table check", async () => {
    const connection = createMockConnection();
    connection.query.mockRejectedValue(new Error("connection lost"));
    const node = createNode();
    const result = await node.execute(
      createContext({ database: "db-1", schema: testSchema }, connection)
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("connection lost");
  });
});
