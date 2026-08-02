import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { BooleanOutputNode } from "./boolean-output-node";

describe("BooleanOutputNode", () => {
  const nodeId = "output-boolean";
  const node = new BooleanOutputNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  it("displays true", async () => {
    const result = await node.execute(createContext({ value: true }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toBe(true);
  });

  it("displays false", async () => {
    const result = await node.execute(createContext({ value: false }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toBe(false);
  });

  it("falls back to false when nothing is connected", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toBe(false);
  });

  it("errors when the value is not a boolean", async () => {
    const result = await node.execute(createContext({ value: "true" }));

    expect(result.status).toBe("error");
    expect(result.error).toBe("Value must be a boolean");
  });
});
