import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";
import { SendQueueBatchNode } from "./send-queue-batch-node";

describe("SendQueueBatchNode", () => {
  const nodeId = "queue-send-batch";
  const node = new SendQueueBatchNode({ nodeId } as unknown as Node);

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

  it("sends the whole batch and reports one id per message", async () => {
    const queue = { sendBatch: vi.fn().mockResolvedValue(undefined) };
    const messages = [{ a: 1 }, { a: 2 }];

    const result = await node.execute(
      createContext({ queueId: "q1", messages }, queueServiceWith(queue))
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.success).toBe(true);
    expect(result.outputs?.count).toBe(2);
    expect(result.outputs?.messageIds).toHaveLength(2);
    expect(queue.sendBatch).toHaveBeenCalledWith(messages);
  });

  it("errors when queueId is missing", async () => {
    const result = await node.execute(createContext({ messages: [{ a: 1 }] }));

    expect(result.status).toBe("error");
    expect(result.error).toBe("'queueId' is a required input.");
  });

  it("errors when messages is not an array", async () => {
    const result = await node.execute(
      createContext({ queueId: "q1", messages: { a: 1 } })
    );

    expect(result.status).toBe("error");
    expect(result.error).toBe("'messages' is required and must be an array.");
  });

  it("errors on an empty batch", async () => {
    const result = await node.execute(
      createContext({ queueId: "q1", messages: [] })
    );

    expect(result.status).toBe("error");
    expect(result.error).toBe("'messages' array cannot be empty.");
  });

  it("errors when the queue service is unavailable", async () => {
    const result = await node.execute(
      createContext({ queueId: "q1", messages: [{ a: 1 }] })
    );

    expect(result.status).toBe("error");
    expect(result.error).toBe("Queue service is not available.");
  });

  it("errors when the queue does not resolve", async () => {
    const result = await node.execute(
      createContext(
        { queueId: "q1", messages: [{ a: 1 }] },
        queueServiceWith(null)
      )
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("not found");
  });

  it("reports a send failure against this node", async () => {
    const queue = { sendBatch: vi.fn().mockRejectedValue(new Error("boom")) };

    const result = await node.execute(
      createContext(
        { queueId: "q1", messages: [{ a: 1 }] },
        queueServiceWith(queue)
      )
    );

    expect(result.status).toBe("error");
    expect(result.error).toBe("Failed to send messages: boom");
  });
});
