import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { DateInputNode } from "./date-input-node";

describe("DateInputNode", () => {
  const nodeId = "date-input";
  const node = new DateInputNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  it("passes an ISO timestamp through", async () => {
    const value = "2026-08-02T10:30:00.000Z";
    const result = await node.execute(createContext({ value }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(value);
  });

  it("accepts a date-only string", async () => {
    const result = await node.execute(createContext({ value: "2026-08-02" }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe("2026-08-02");
  });

  it("errors on an unparseable date", async () => {
    const result = await node.execute(createContext({ value: "not-a-date" }));

    expect(result.status).toBe("error");
    expect(result.error).toBe("Invalid date format");
  });

  it("returns an empty string when no value is provided", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe("");
  });

  it("returns an empty string for an empty value", async () => {
    const result = await node.execute(createContext({ value: "" }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe("");
  });
});
