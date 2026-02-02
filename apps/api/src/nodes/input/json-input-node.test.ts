import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../../runtime/node-types";
import { JsonInputNode } from "./json-input-node";

describe("JsonInputNode", () => {
  it("should execute with valid JSON object", async () => {
    const nodeId = "json-editor";
    const node = new JsonInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        json: { name: "John", age: 30, active: true },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.json).toEqual({
      name: "John",
      age: 30,
      active: true,
    });
  });

  it("should execute with empty object", async () => {
    const nodeId = "json-editor";
    const node = new JsonInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        json: {},
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.json).toEqual({});
  });

  it("should execute with array", async () => {
    const nodeId = "json-editor";
    const node = new JsonInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        json: [1, 2, 3, "test", { nested: "value" }],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.json).toEqual([
      1,
      2,
      3,
      "test",
      { nested: "value" },
    ]);
  });

  it("should execute with primitive string value", async () => {
    const nodeId = "json-editor";
    const node = new JsonInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        json: "simple string",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.json).toBe("simple string");
  });

  it("should handle null input", async () => {
    const nodeId = "json-editor";
    const node = new JsonInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        json: null,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle undefined input", async () => {
    const nodeId = "json-editor";
    const node = new JsonInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        json: undefined,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBeDefined();
  });

  it("should handle complex nested object", async () => {
    const nodeId = "json-editor";
    const node = new JsonInputNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        json: {
          user: {
            id: 123,
            profile: {
              name: "John Doe",
              email: "john@example.com",
              preferences: {
                theme: "dark",
                notifications: true,
              },
            },
            roles: ["admin", "user"],
            metadata: {
              created: "2023-01-01",
              lastLogin: "2023-12-01",
            },
          },
          settings: {
            enabled: true,
            timeout: 5000,
          },
        },
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.json).toEqual({
      user: {
        id: 123,
        profile: {
          name: "John Doe",
          email: "john@example.com",
          preferences: {
            theme: "dark",
            notifications: true,
          },
        },
        roles: ["admin", "user"],
        metadata: {
          created: "2023-01-01",
          lastLogin: "2023-12-01",
        },
      },
      settings: {
        enabled: true,
        timeout: 5000,
      },
    });
  });
});
