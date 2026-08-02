import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { TextOutputNode } from "./text-output-node";

describe("TextOutputNode", () => {
  const nodeId = "output-text";
  const node = new TextOutputNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  it("displays the supplied text", async () => {
    const result = await node.execute(createContext({ value: "hello" }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toBe("hello");
  });

  it("displays an empty string when nothing is connected", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toBe("");
  });

  it("preserves multi-line text", async () => {
    const value = "first\nsecond";
    const result = await node.execute(createContext({ value }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toBe(value);
  });
});
