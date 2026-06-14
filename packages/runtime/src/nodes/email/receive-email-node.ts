import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class ReceiveEmailNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "receive-email",
    name: "Receive Email",
    type: "receive-email",
    description:
      "Extracts from, to, headers, and raw content from an incoming email.",
    tags: ["Social", "Email", "Receive"],
    icon: "mail",
    documentation:
      "This node extracts information from incoming emails, providing access to sender, recipient, headers, and raw content.",
    trigger: true,
    subscription: true,
    inlinable: true,
    inputs: [
      {
        name: "email",
        type: "email",
        description: "Email to receive from",
        required: false,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "from",
        type: "string",
        description: "The sender's email address.",
      },
      {
        name: "to",
        type: "string",
        description: "The recipient's email address.",
      },
      {
        name: "headers",
        type: "json",
        description: "Email headers as a JSON object.",
      },
      {
        name: "raw",
        type: "string",
        description: "The raw email content as a string.",
      },
      {
        name: "threadId",
        type: "string",
        description:
          "Mailbox thread this email belongs to (for threading replies and reading history).",
        hidden: true,
      },
      {
        name: "messageId",
        type: "string",
        description: "Mailbox id of this stored message.",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      if (!context.emailMessage) {
        throw new Error(
          "Email message information is required but not provided in the context."
        );
      }

      const { from, to, headers, raw, threadId, messageId } =
        context.emailMessage;
      return this.createSuccessResult({
        from,
        to,
        headers,
        raw,
        threadId,
        messageId,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
