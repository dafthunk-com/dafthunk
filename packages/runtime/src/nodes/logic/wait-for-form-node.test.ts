import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { WaitForFormNode } from "./wait-for-form-node";

describe("WaitForFormNode", () => {
  const nodeId = "wait-for-form";
  const node = new WaitForFormNode({ id: nodeId } as unknown as Node);

  const createContext = (
    inputs: Record<string, unknown>,
    overrides: Record<string, unknown> = {}
  ): NodeContext =>
    ({
      nodeId,
      inputs,
      asyncSupported: true,
      executionId: "exec-1",
      ...overrides,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  it("suspends on an event keyed to the form token", async () => {
    const result = await node.execute(createContext({ token: "abc" }));

    expect(result.status).toBe("pending");
    expect(result.pendingEvent?.type).toBe("form-response-abc");
    expect(result.pendingEvent?.timeout).toBe("24 hours");
    expect(result.usage).toBe(0);
  });

  it("errors when no token is connected", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Token is required");
  });

  it("errors when the runtime cannot suspend", async () => {
    const result = await node.execute(
      createContext({ token: "abc" }, { asyncSupported: false })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("durable workflow execution");
  });

  it("errors outside a workflow execution", async () => {
    const result = await node.execute(
      createContext({ token: "abc" }, { executionId: undefined })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("durable workflow execution");
  });
});
