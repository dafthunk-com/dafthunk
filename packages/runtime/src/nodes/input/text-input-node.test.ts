import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { TextInputNode } from "./text-input-node";

describe("TextInputNode", () => {
  const nodeId = "text-input";
  const node = new TextInputNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  it("passes the entered text through", async () => {
    const result = await node.execute(createContext({ value: "hello" }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe("hello");
  });

  it("accepts an empty string", async () => {
    const result = await node.execute(createContext({ value: "" }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe("");
  });

  it("preserves multi-line text", async () => {
    const value = "line one\nline two";
    const result = await node.execute(createContext({ value }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(value);
  });

  it("errors when the value is not a string", async () => {
    const result = await node.execute(createContext({ value: 42 }));

    expect(result.status).toBe("error");
    expect(result.error).toBe("Value must be a string");
  });

  it("errors when no value is provided", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toBe("Value must be a string");
  });
});
