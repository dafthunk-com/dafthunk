import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType, Schema } from "@dafthunk/types";
import { validateRecord } from "../../utils/schema-validation";

export class ReceiveQueueMessageNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "queue-message",
    name: "Receive Queue Message",
    type: "queue-message",
    description: "Receives and extracts the message payload from a queue.",
    tags: ["Data", "Parameter", "Queue"],
    icon: "inbox",
    documentation:
      "This node extracts the message payload from a queue-triggered workflow, providing access to the data sent when the message was published.",
    inlinable: true,
    asTool: true,
    trigger: true,
    inputs: [
      {
        name: "queueId",
        type: "queue",
        description: "The queue ID to listen to for messages.",
        required: true,
        hidden: true,
      },
      {
        name: "schema",
        type: "schema",
        description:
          "Optional schema to validate and coerce the received message payload.",
        required: false,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "payload",
        type: "json",
        description: "The queue message payload",
      },
      {
        name: "queueId",
        type: "string",
        description: "The ID of the queue this message came from",
      },
      {
        name: "timestamp",
        type: "number",
        description: "The timestamp when the message was published",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    const { schema } = context.inputs;

    try {
      if (!context.queueMessage) {
        throw new Error(
          "Queue message information is required but not provided in the context."
        );
      }

      let payload = context.queueMessage.payload;

      if (schema) {
        if (
          typeof payload !== "object" ||
          payload === null ||
          Array.isArray(payload)
        ) {
          return this.createErrorResult(
            "Schema validation requires payload to be a JSON object."
          );
        }
        const { record, errors } = validateRecord(
          payload as Record<string, unknown>,
          schema as Schema
        );
        if (errors.length > 0) {
          return this.createErrorResult(
            `Schema validation failed: ${errors.join("; ")}`
          );
        }
        payload = record;
      }

      return this.createSuccessResult({
        payload,
        queueId: context.queueMessage.queueId,
        timestamp: context.queueMessage.timestamp,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
