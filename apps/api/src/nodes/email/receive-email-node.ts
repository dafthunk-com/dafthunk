import { Node, NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

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
    compatibility: ["email_message"],
    inlinable: true,
    inputs: [
      {
        name: "emailId",
        type: "email",
        description: "Email inbox to receive from",
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
    ],
  };

  constructor(node: Node) {
    super(node);
  }

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      if (!context.emailMessage) {
        throw new Error(
          "Email message information is required but not provided in the context."
        );
      }

      return this.createSuccessResult({
        ...context.emailMessage,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
