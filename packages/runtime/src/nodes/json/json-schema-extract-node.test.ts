import type { NodeContext } from "@dafthunk/runtime";
import type { Node, Schema } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { JsonSchemaExtractNode } from "./json-schema-extract-node";

const testSchema: Schema = {
  name: "person",
  fields: [
    { name: "name", type: "string", required: true },
    { name: "age", type: "integer" },
    { name: "active", type: "boolean" },
  ],
};

function createNode() {
  return new JsonSchemaExtractNode({
    nodeId: "test",
  } as unknown as Node);
}

function createContext(
  inputs: Record<string, unknown>,
  schema?: Schema
): NodeContext {
  return {
    nodeId: "test",
    organizationId: "org-1",
    inputs,
    schemaService: {
      resolve: async () => schema,
    },
    getIntegration: async () => {
      throw new Error("No integrations in test");
    },
  } as unknown as NodeContext;
}

describe("JsonSchemaExtractNode", () => {
  it("should extract fields from a record matching the schema", async () => {
    const node = createNode();
    const context = createContext(
      {
        schemaId: "schema-1",
        record: { name: "Alice", age: 30, active: true },
      },
      testSchema
    );

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.name).toBe("Alice");
    expect(result.outputs?.age).toBe(30);
    expect(result.outputs?.active).toBe(true);
  });

  it("should output null for missing fields", async () => {
    const node = createNode();
    const context = createContext(
      {
        schemaId: "schema-1",
        record: { name: "Bob" },
      },
      testSchema
    );

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.name).toBe("Bob");
    expect(result.outputs?.age).toBeNull();
    expect(result.outputs?.active).toBeNull();
  });

  it("should ignore extra fields not in the schema", async () => {
    const node = createNode();
    const context = createContext(
      {
        schemaId: "schema-1",
        record: { name: "Carol", age: 25, active: false, email: "c@x.com" },
      },
      testSchema
    );

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.name).toBe("Carol");
    expect(result.outputs?.email).toBeUndefined();
  });

  it("should error when schemaId is missing", async () => {
    const node = createNode();
    const context = createContext({ record: { name: "X" } }, testSchema);

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("schema must be selected");
  });

  it("should error when record is missing", async () => {
    const node = createNode();
    const context = createContext({ schemaId: "schema-1" }, testSchema);

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("JSON object is required");
  });

  it("should error when record is an array", async () => {
    const node = createNode();
    const context = createContext(
      { schemaId: "schema-1", record: [1, 2, 3] },
      testSchema
    );

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("JSON object is required");
  });

  it("should error when schema is not found", async () => {
    const node = createNode();
    const context = createContext(
      { schemaId: "missing", record: { name: "X" } },
      undefined
    );

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("not found");
  });

  it("should error when schemaService is not available", async () => {
    const node = createNode();
    const context = {
      nodeId: "test",
      organizationId: "org-1",
      inputs: { schemaId: "schema-1", record: { name: "X" } },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Schema service not available");
  });
});
