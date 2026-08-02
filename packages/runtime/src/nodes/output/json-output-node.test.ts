import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { JsonOutputNode } from "./json-output-node";

describe("JsonOutputNode", () => {
  const nodeId = "output-json";
  const node = new JsonOutputNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  it("displays an object", async () => {
    const value = { name: "dafthunk", count: 3 };
    const result = await node.execute(createContext({ value }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toEqual(value);
  });

  it("displays an array", async () => {
    const result = await node.execute(createContext({ value: [1, 2, 3] }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toEqual([1, 2, 3]);
  });

  it("displays nested structures unchanged", async () => {
    const value = { a: { b: [{ c: null }] } };
    const result = await node.execute(createContext({ value }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toEqual(value);
  });

  it("falls back to an empty object when nothing is connected", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toEqual({});
  });
});
