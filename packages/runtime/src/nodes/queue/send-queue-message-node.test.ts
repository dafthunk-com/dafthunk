import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import { SendQueueMessageNode } from "./send-queue-message-node";

describe("SendQueueMessageNode", () => {
  const nodeId = "queue-send";
  const node = new SendQueueMessageNode({ nodeId } as unknown as Node);

  const createContext = (
    inputs: Record<string, unknown>,
    queueService?: unknown
  ): NodeContext =>
    ({
      nodeId,
      organizationId: "org-1",
      inputs,
      queueService,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  const queueServiceWith = (queue: unknown) => ({
    resolve: vi.fn().mockResolvedValue(queue),
  });

  it("sends the message to the resolved queue", async () => {
    const queue = { send: vi.fn().mockResolvedValue(undefined) };
    const queueService = queueServiceWith(queue);

    const result = await node.execute(
      createContext({ queueId: "q1", message: { a: 1 } }, queueService)
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.success).toBe(true);
    expect(result.outputs?.messageId).toMatch(/^msg_/);
    expect(queueService.resolve).toHaveBeenCalledWith("q1", "org-1");
    expect(queue.send).toHaveBeenCalledWith({ a: 1 });
  });

  it("errors when queueId is missing", async () => {
    const result = await node.execute(createContext({ message: { a: 1 } }));

    expect(result.status).toBe("error");
    expect(result.error).toBe("'queueId' is a required input.");
  });

  it("errors when the message is missing", async () => {
    const result = await node.execute(createContext({ queueId: "q1" }));

    expect(result.status).toBe("error");
    expect(result.error).toBe("'message' is a required input.");
  });

  it("errors when the queue service is unavailable", async () => {
    const result = await node.execute(
      createContext({ queueId: "q1", message: { a: 1 } })
    );

    expect(result.status).toBe("error");
    expect(result.error).toBe("Queue service is not available.");
  });

  it("errors when the queue does not resolve", async () => {
    const result = await node.execute(
      createContext(
        { queueId: "q1", message: { a: 1 } },
        queueServiceWith(null)
      )
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("not found");
  });

  it("reports a send failure against this node", async () => {
    const queue = { send: vi.fn().mockRejectedValue(new Error("boom")) };

    const result = await node.execute(
      createContext(
        { queueId: "q1", message: { a: 1 } },
        queueServiceWith(queue)
      )
    );

    expect(result.status).toBe("error");
    expect(result.error).toBe("Failed to send message: boom");
  });

  it("rejects a non-object message when a schema is supplied", async () => {
    const queue = { send: vi.fn() };

    const result = await node.execute(
      createContext(
        {
          queueId: "q1",
          message: "not-an-object",
          schema: { fields: [{ name: "a", type: "string" }] },
        },
        queueServiceWith(queue)
      )
    );

    expect(result.status).toBe("error");
    expect(result.error).toBe(
      "Schema validation requires message to be a JSON object."
    );
    expect(queue.send).not.toHaveBeenCalled();
  });
});
