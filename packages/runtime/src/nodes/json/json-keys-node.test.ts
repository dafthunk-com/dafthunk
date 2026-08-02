import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { JsonKeysNode } from "./json-keys-node";

describe("JsonKeysNode", () => {
  const nodeId = "json-keys";
  const node = new JsonKeysNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  it("returns the top-level keys by default", async () => {
    const result = await node.execute(
      createContext({ json: { a: 1, b: 2, c: 3 } })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.keys).toEqual(["a", "b", "c"]);
    expect(result.outputs?.count).toBe(3);
    expect(result.outputs?.isValid).toBe(true);
  });

  it("returns the keys at a nested path", async () => {
    const result = await node.execute(
      createContext({
        json: { user: { name: "ada", age: 36 } },
        path: "$.user",
      })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.keys).toEqual(["name", "age"]);
    expect(result.outputs?.count).toBe(2);
  });

  it("returns no keys for an array", async () => {
    const result = await node.execute(createContext({ json: [1, 2, 3] }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.keys).toEqual([]);
    expect(result.outputs?.count).toBe(0);
  });

  it("returns no keys for a primitive", async () => {
    const result = await node.execute(
      createContext({ json: { a: 1 }, path: "$.a" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.keys).toEqual([]);
  });

  it("reports an empty object as having no keys", async () => {
    const result = await node.execute(createContext({ json: {} }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.keys).toEqual([]);
    expect(result.outputs?.isValid).toBe(true);
  });

  it("marks a missing path as valid but empty", async () => {
    const result = await node.execute(
      createContext({ json: { a: 1 }, path: "$.nope" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.keys).toEqual([]);
    expect(result.outputs?.isValid).toBe(true);
  });

  it("marks null input as invalid", async () => {
    const result = await node.execute(createContext({ json: null }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.isValid).toBe(false);
    expect(result.outputs?.keys).toEqual([]);
  });
});
