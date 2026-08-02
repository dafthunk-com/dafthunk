import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { AnyOutputNode } from "./any-output-node";

describe("AnyOutputNode", () => {
  const nodeId = "output-any";
  const node = new AnyOutputNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  it("displays a string unchanged", async () => {
    const result = await node.execute(createContext({ value: "hello" }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toBe("hello");
  });

  it("displays a number unchanged", async () => {
    const result = await node.execute(createContext({ value: 7 }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toBe(7);
  });

  it("displays an object unchanged", async () => {
    const value = { a: 1 };
    const result = await node.execute(createContext({ value }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toEqual(value);
  });

  it("displays a blob unchanged", async () => {
    const value = { data: new Uint8Array([1, 2]), mimeType: "image/png" };
    const result = await node.execute(createContext({ value }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toEqual(value);
  });

  it("accepts an absent value without erroring", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toBeUndefined();
  });
});
