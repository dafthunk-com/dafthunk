import { Node, NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../../runtime/node-types";

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
    compatibility: ["queue_message"],
    inputs: [
      {
        name: "queueId",
        type: "queue",
        description: "The queue ID to listen to for messages.",
        required: true,
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

  constructor(node: Node) {
    super(node);
  }

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      if (!context.queueMessage) {
        throw new Error(
          "Queue message information is required but not provided in the context."
        );
      }

      return this.createSuccessResult({
        payload: context.queueMessage.payload,
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
