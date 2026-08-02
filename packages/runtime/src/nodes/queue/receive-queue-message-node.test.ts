import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { ReceiveQueueMessageNode } from "./receive-queue-message-node";

describe("ReceiveQueueMessageNode", () => {
  const nodeId = "queue-message";
  const node = new ReceiveQueueMessageNode({ nodeId } as unknown as Node);

  const createContext = (
    inputs: Record<string, unknown>,
    queueMessage?: unknown
  ): NodeContext =>
    ({
      nodeId,
      inputs,
      queueMessage,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  const message = {
    payload: { orderId: "A1" },
    queueId: "q1",
    timestamp: "2026-08-02T10:00:00.000Z",
  };

  it("exposes the payload with its queue and timestamp", async () => {
    const result = await node.execute(createContext({}, message));

    expect(result.status).toBe("completed");
    expect(result.outputs?.payload).toEqual({ orderId: "A1" });
    expect(result.outputs?.queueId).toBe("q1");
    expect(result.outputs?.timestamp).toBe("2026-08-02T10:00:00.000Z");
  });

  it("errors when the workflow was not triggered by a queue", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Queue message information is required");
  });

  it("rejects a non-object payload when a schema is supplied", async () => {
    const result = await node.execute(
      createContext(
        { schema: { fields: [{ name: "orderId", type: "string" }] } },
        { ...message, payload: "not-an-object" }
      )
    );

    expect(result.status).toBe("error");
    expect(result.error).toBe(
      "Schema validation requires payload to be a JSON object."
    );
  });
});
