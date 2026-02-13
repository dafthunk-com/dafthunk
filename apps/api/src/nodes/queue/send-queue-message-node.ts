import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";

export class SendQueueMessageNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "queue-send",
    name: "Send Queue Message",
    type: "queue-send",
    description: "Sends a single message to a message queue.",
    tags: ["Queue", "Send", "Message"],
    icon: "send",
    documentation:
      "Sends a message to a queue. The message will be delivered to all workflows subscribed to the queue, triggering their execution with the message payload as input.",
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
        name: "message",
        type: "json",
        description: "Message payload (any JSON value).",
        required: true,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "True if message was sent successfully.",
      },
      {
        name: "messageId",
        type: "string",
        description: "Unique identifier for the sent message.",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { queueId: queueIdOrHandle, message } = context.inputs;

    // Validate required inputs
    if (!queueIdOrHandle) {
      return this.createErrorResult("'queueId' is a required input.");
    }

    if (message === undefined || message === null) {
      return this.createErrorResult("'message' is a required input.");
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

      await queue.send(message, context.mode);

      // Generate a pseudo message ID (timestamp-based)
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      return this.createSuccessResult({
        success: true,
        messageId,
      });
    } catch (error) {
      return this.createErrorResult(
        `Failed to send message: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
