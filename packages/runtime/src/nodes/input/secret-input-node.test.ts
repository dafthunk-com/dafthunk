import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { SecretInputNode } from "./secret-input-node";

describe("SecretInputNode", () => {
  const nodeId = "secret-input";
  const node = new SecretInputNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  it("passes the selected secret name through", async () => {
    const result = await node.execute(createContext({ value: "OPENAI_KEY" }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toBe("OPENAI_KEY");
  });

  it("errors when no secret is selected", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toBe("No secret selected");
  });

  it("errors on an empty selection", async () => {
    const result = await node.execute(createContext({ value: "" }));

    expect(result.status).toBe("error");
    expect(result.error).toBe("No secret selected");
  });
});
