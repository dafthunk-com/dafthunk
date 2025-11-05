import { NodeExecution, NodeType, QueueMessage } from "@dafthunk/types";

import { createDatabase, getQueue } from "../../db";
import { ExecutableNode, NodeContext } from "../types";

export class PublishQueueMessageNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "queue-publish",
    name: "Publish Queue Message",
    type: "queue-publish",
    description: "Publishes a message to a queue.",
    tags: ["Queue", "Publish", "Message"],
    icon: "send",
    documentation:
      "This node publishes a message to a queue. The message will trigger workflows subscribed to this queue.",
    asTool: true,
    inputs: [
      {
        name: "queueId",
        type: "string",
        description: "The queue ID or handle to publish to.",
        required: true,
        hidden: true,
      },
      {
        name: "message",
        type: "json",
        description: "The message payload to publish (JSON).",
        required: true,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "Whether the message was successfully published.",
      },
      {
        name: "messageId",
        type: "string",
        description: "The ID of the published message.",
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

      // Publish to Cloudflare Queue
      await context.env.WORKFLOW_QUEUE.send(queueMessage);

      // Generate a pseudo message ID (timestamp-based)
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      return this.createSuccessResult({
        success: true,
        messageId,
      });
    } catch (error) {
      return this.createErrorResult(
        `Failed to publish message: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
