import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { SecretOutputNode } from "./secret-output-node";

describe("SecretOutputNode", () => {
  const nodeId = "output-secret";
  const node = new SecretOutputNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  it("displays the secret name, never a secret value", async () => {
    const result = await node.execute(createContext({ value: "OPENAI_KEY" }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toBe("OPENAI_KEY");
  });

  it("falls back to an empty string when nothing is connected", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toBe("");
  });

  it("errors when the reference is not a string", async () => {
    const result = await node.execute(createContext({ value: 123 }));

    expect(result.status).toBe("error");
    expect(result.error).toBe("Value must be a secret name reference");
  });
});
