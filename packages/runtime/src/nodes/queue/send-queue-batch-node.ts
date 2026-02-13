import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class SendQueueBatchNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "queue-send-batch",
    name: "Send Queue Batch",
    type: "queue-send-batch",
    description:
      "Sends multiple messages to a message queue in a single batch operation.",
    tags: ["Queue", "Send", "Message", "Batch"],
    icon: "send",
    documentation:
      "Sends multiple messages to a queue efficiently in a single batch operation. Each message will be delivered independently to all workflows subscribed to the queue. Use this for high-throughput scenarios when you need to send many messages at once.",
    asTool: true,
    inputs: [
      {
        name: "queueId",
        type: "queue",
        description: "Queue ID or handle.",
        required: true,
        hidden: true,
      },
      {
        name: "messages",
        type: "json",
        description: "Array of message payloads (array of any JSON values).",
        required: true,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "True if all messages were sent successfully.",
      },
      {
        name: "messageIds",
        type: "json",
        description: "Array of unique identifiers for the sent messages.",
      },
      {
        name: "count",
        type: "number",
        description: "Total number of messages sent in the batch.",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { queueId: queueIdOrHandle, messages } = context.inputs;

    // Validate required inputs
    if (!queueIdOrHandle) {
      return this.createErrorResult("'queueId' is a required input.");
    }

    if (!messages || !Array.isArray(messages)) {
      return this.createErrorResult(
        "'messages' is required and must be an array."
      );
    }

    if (messages.length === 0) {
      return this.createErrorResult("'messages' array cannot be empty.");
    }

    if (!context.queueService) {
      return this.createErrorResult("Queue service is not available.");
    }

    try {
      const queue = await context.queueService.resolve(
        queueIdOrHandle,
        context.organizationId
      );

      if (!queue) {
        return this.createErrorResult(
          `Queue '${queueIdOrHandle}' not found or does not belong to your organization.`
        );
      }

      await queue.sendBatch(messages, context.mode);

      // Generate message IDs
      const messageIds = messages.map(
        (_, index) =>
          `msg_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 9)}`
      );

      return this.createSuccessResult({
        success: true,
        messageIds,
        count: messages.length,
      });
    } catch (error) {
      return this.createErrorResult(
        `Failed to send messages: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
