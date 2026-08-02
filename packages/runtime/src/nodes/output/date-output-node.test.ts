import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { DateOutputNode } from "./date-output-node";

describe("DateOutputNode", () => {
  const nodeId = "output-date";
  const node = new DateOutputNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  it("displays the supplied ISO timestamp", async () => {
    const value = "2026-08-02T10:30:00.000Z";
    const result = await node.execute(createContext({ value }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toBe(value);
  });

  it("falls back to the current time when nothing is connected", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("completed");
    const displayed = result.outputs?.displayValue as string;
    expect(Number.isNaN(new Date(displayed).getTime())).toBe(false);
  });

  it("errors when the value is not a string", async () => {
    const result = await node.execute(createContext({ value: 1754130600000 }));

    expect(result.status).toBe("error");
    expect(result.error).toBe("Value must be an ISO 8601 date string");
  });
});
