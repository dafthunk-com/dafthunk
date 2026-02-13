import { NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { ToJsonNode } from "./to-json-node";

describe("ToJsonNode", () => {
  it("should convert number to JSON", async () => {
    const nodeId = "to-json";
    const node = new ToJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: 123,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe("123");
  });

  it("should convert boolean to JSON", async () => {
    const nodeId = "to-json";
    const node = new ToJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: true,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("true");
  });

  it("should convert string to JSON", async () => {
    const nodeId = "to-json";
    const node = new ToJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: "Hello World",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe('"Hello World"');
  });

  it("should convert array to JSON", async () => {
    const nodeId = "to-json";
    const node = new ToJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: [1, 2, 3, "test"],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe('[1,2,3,"test"]');
  });

  it("should convert object to JSON", async () => {
    const nodeId = "to-json";
    const node = new ToJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: { name: "John", age: 30, active: true },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(
      '{"name":"John","age":30,"active":true}'
    );
  });

  it("should convert null to JSON", async () => {
    const nodeId = "to-json";
    const node = new ToJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: null,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("null");
  });

  it("should handle pretty print option", async () => {
    const nodeId = "to-json";
    const node = new ToJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: { name: "John", age: 30 },
        prettyPrint: true,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe('{\n  "name": "John",\n  "age": 30\n}');
  });

  it("should handle nested objects", async () => {
    const nodeId = "to-json";
    const node = new ToJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: {
          user: {
            profile: {
              name: "John",
              contacts: ["email@test.com", "phone123"],
            },
          },
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(
      '{"user":{"profile":{"name":"John","contacts":["email@test.com","phone123"]}}}'
    );
  });

  it("should handle undefined input", async () => {
    const nodeId = "to-json";
    const node = new ToJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Value is required");
  });

  it("should handle circular references gracefully", async () => {
    const nodeId = "to-json";
    const node = new ToJsonNode({
      nodeId,
    } as unknown as Node);

    // Create circular reference
    const obj: any = { name: "test" };
    obj.circular = obj;

    const context = {
      nodeId,
      inputs: {
        value: obj,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Unable to convert value to JSON");
  });

  it("should handle functions gracefully", async () => {
    const nodeId = "to-json";
    const node = new ToJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: {
          name: "test",
          fn: function () {
            return "hello";
          },
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe('{"name":"test"}');
  });
});
