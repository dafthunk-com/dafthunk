import type { NodeContext } from "@dafthunk/runtime";
import type { Node, Schema } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { JsonSchemaComposeNode } from "./json-schema-compose-node";

const testSchema: Schema = {
  name: "person",
  fields: [
    { name: "name", type: "string", required: true },
    { name: "age", type: "integer" },
    { name: "active", type: "boolean" },
  ],
};

function createNode() {
  return new JsonSchemaComposeNode({
    nodeId: "test",
  } as unknown as Node);
}

function createContext(inputs: Record<string, unknown>): NodeContext {
  return {
    nodeId: "test",
    organizationId: "org-1",
    inputs,
    getIntegration: async () => {
      throw new Error("No integrations in test");
    },
  } as unknown as NodeContext;
}

describe("JsonSchemaComposeNode", () => {
  it("should compose a record from individual field inputs", async () => {
    const node = createNode();
    const context = createContext({
      schema: testSchema,
      name: "Alice",
      age: 30,
      active: true,
    });

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.record).toEqual({
      name: "Alice",
      age: 30,
      active: true,
    });
  });

  it("should output null for missing field inputs", async () => {
    const node = createNode();
    const context = createContext({
      schema: testSchema,
      name: "Bob",
    });

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.record).toEqual({
      name: "Bob",
      age: null,
      active: null,
    });
  });

  it("should ignore extra inputs not in the schema", async () => {
    const node = createNode();
    const context = createContext({
      schema: testSchema,
      name: "Carol",
      age: 25,
      active: false,
      email: "c@x.com",
    });

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    const record = result.outputs?.record as Record<string, unknown>;
    expect(record.name).toBe("Carol");
    expect(record.email).toBeUndefined();
  });

  it("should error when schema is missing", async () => {
    const node = createNode();
    const context = createContext({ name: "X" });

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("schema must be selected");
  });

  it("should error when schema is not a valid object", async () => {
    const node = createNode();
    const context = createContext({
      schema: "not-an-object",
      name: "X",
    });

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("schema must be selected");
  });
});
