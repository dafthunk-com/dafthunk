import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { BooleanInputNode } from "./boolean-input-node";

describe("BooleanInputNode", () => {
  const nodeId = "boolean-input";
  const node = new BooleanInputNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  it("passes a true boolean through", async () => {
    const result = await node.execute(createContext({ value: true }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(true);
  });

  it("passes a false boolean through", async () => {
    const result = await node.execute(createContext({ value: false }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(false);
  });

  it('reads the string "true" as true', async () => {
    const result = await node.execute(createContext({ value: "true" }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(true);
  });

  it('reads the string "false" as false', async () => {
    const result = await node.execute(createContext({ value: "false" }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(false);
  });

  it("reads any other string as false", async () => {
    const result = await node.execute(createContext({ value: "yes" }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(false);
  });

  it("coerces a missing value to false", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(false);
  });

  it("coerces a non-zero number to true", async () => {
    const result = await node.execute(createContext({ value: 1 }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe(true);
  });
});
