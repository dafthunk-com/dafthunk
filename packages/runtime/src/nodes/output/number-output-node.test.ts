import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { NumberOutputNode } from "./number-output-node";

describe("NumberOutputNode", () => {
  const nodeId = "output-number";
  const node = new NumberOutputNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  it("displays the supplied number", async () => {
    const result = await node.execute(createContext({ value: 42 }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toBe(42);
  });

  it("displays zero rather than treating it as absent", async () => {
    const result = await node.execute(createContext({ value: 0 }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toBe(0);
  });

  it("displays negative and fractional values", async () => {
    const result = await node.execute(createContext({ value: -3.5 }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toBe(-3.5);
  });

  it("falls back to zero when nothing is connected", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toBe(0);
  });

  it("errors when the value is not a number", async () => {
    const result = await node.execute(createContext({ value: "42" }));

    expect(result.status).toBe("error");
    expect(result.error).toBe("Value must be a number");
  });
});
