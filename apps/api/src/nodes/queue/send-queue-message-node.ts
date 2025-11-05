import { NodeExecution, NodeType, QueueMessage } from "@dafthunk/types";

import { createDatabase, getQueue } from "../../db";
import { ExecutableNode, NodeContext } from "../types";

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
        type: "string",
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

    try {
      // Get queue from database to verify it exists and belongs to the organization
      const db = createDatabase(context.env.DB);
      const queue = await getQueue(db, queueIdOrHandle, context.organizationId);

      if (!queue) {
        return this.createErrorResult(
          `Queue '${queueIdOrHandle}' not found or does not belong to your organization.`
        );
      }

      // Prepare the queue message
      const queueMessage: QueueMessage = {
        queueId: queue.id,
        organizationId: context.organizationId,
        payload: message,
        timestamp: Date.now(),
        mode: context.mode,
      };

      // Send to Cloudflare Queue
      await context.env.WORKFLOW_QUEUE.send(queueMessage);

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
