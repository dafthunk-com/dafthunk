import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType, Schema } from "@dafthunk/types";
import { validateRecord } from "../../utils/schema-validation";

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
        description: "Queue ID.",
        required: true,
        hidden: true,
      },
      {
        name: "schema",
        type: "schema",
        description:
          "Optional schema to validate and coerce message payload before sending.",
        required: false,
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
    const { queueId, message, schema } = context.inputs;

    // Validate required inputs
    if (!queueId) {
      return this.createErrorResult("'queueId' is a required input.");
    }

    if (message === undefined || message === null) {
      return this.createErrorResult("'message' is a required input.");
    }

    let validatedMessage = message;
    if (schema) {
      if (
        typeof message !== "object" ||
        message === null ||
        Array.isArray(message)
      ) {
        return this.createErrorResult(
          "Schema validation requires message to be a JSON object."
        );
      }
      const { record, errors } = validateRecord(
        message as Record<string, unknown>,
        schema as Schema
      );
      if (errors.length > 0) {
        return this.createErrorResult(
          `Schema validation failed: ${errors.join("; ")}`
        );
      }
      validatedMessage = record;
    }

    if (!context.queueService) {
      return this.createErrorResult("Queue service is not available.");
    }

    try {
      const queue = await context.queueService.resolve(
        queueId,
        context.organizationId
      );

      if (!queue) {
        return this.createErrorResult(
          `Queue '${queueId}' not found or does not belong to your organization.`
        );
      }

      await queue.send(validatedMessage);

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
