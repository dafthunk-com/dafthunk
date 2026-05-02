import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { StringEqualsNode } from "./string-equals-node";

function makeNode() {
  return new StringEqualsNode({ nodeId: "string-equals" } as unknown as Node);
}

function makeContext(inputs: Record<string, unknown>): NodeContext {
  return {
    nodeId: "string-equals",
    inputs,
    getIntegration: async () => {
      throw new Error("No integrations in test");
    },
    env: {},
  } as unknown as NodeContext;
}

describe("StringEqualsNode", () => {
  it("returns true for identical strings", async () => {
    const result = await makeNode().execute(
      makeContext({ a: "hello", b: "hello" })
    );
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(true);
  });

  it("returns false for different strings", async () => {
    const result = await makeNode().execute(
      makeContext({ a: "hello", b: "world" })
    );
    expect(result.outputs?.result).toBe(false);
  });

  it("is case-sensitive by default", async () => {
    const result = await makeNode().execute(
      makeContext({ a: "Hello", b: "hello" })
    );
    expect(result.outputs?.result).toBe(false);
  });

  it("ignores case when ignoreCase is true", async () => {
    const result = await makeNode().execute(
      makeContext({ a: "Hello", b: "HELLO", ignoreCase: true })
    );
    expect(result.outputs?.result).toBe(true);
  });

  it("treats two empty strings as equal", async () => {
    const result = await makeNode().execute(makeContext({ a: "", b: "" }));
    expect(result.outputs?.result).toBe(true);
  });

  it("errors on missing input", async () => {
    const result = await makeNode().execute(makeContext({ a: "hello" }));
    expect(result.status).toBe("error");
  });

  it("errors when an input is not a string", async () => {
    const result = await makeNode().execute(makeContext({ a: "hello", b: 42 }));
    expect(result.status).toBe("error");
  });
});
