import { Node, NodeExecution, NodeType } from "@dafthunk/types";
import { simpleParser, ParsedMail } from "mailparser";
import { ExecutableNode, NodeContext } from "../types";

// Helper to ensure addresses are in the expected format
const formatAddresses = (addresses: any) => {
  if (!addresses) return [];
  if (Array.isArray(addresses)) {
    return addresses.map((addr) => ({
      address: addr.address || "",
      name: addr.name || "",
    }));
  }
  // Handle single address object
  if (addresses.value && Array.isArray(addresses.value)) {
    return addresses.value.map((addr: any) => ({
      address: addr.address || "",
      name: addr.name || "",
    }));
  }
  return [];
};

export class EmailParserNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "email-parser",
    name: "Email Parser",
    type: "email-parser",
    description:
      "Parses raw email content and extracts key fields like subject, body, sender, recipients, and attachments.",
    category: "Email",
    icon: "mail",
    inputs: [
      {
        name: "rawEmail",
        type: "string",
        description: "The raw email content as a string.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "subject",
        type: "string",
        description: "The subject of the email.",
      },
      {
        name: "text",
        type: "string",
        description: "The plain text content of the email.",
      },
      {
        name: "html",
        type: "string",
        description: "The HTML content of the email.",
      },
      {
        name: "from",
        type: "json",
        description: "Sender's email address(es).",
      },
      {
        name: "to",
        type: "json",
        description: "Recipient's email address(es).",
      },
      {
        name: "cc",
        type: "json",
        description: "CC recipient's email address(es).",
      },
      {
        name: "bcc",
        type: "json",
        description: "BCC recipient's email address(es).",
      },
      {
        name: "replyTo",
        type: "json",
        description: "Reply-to email address(es).",
      },
      {
        name: "date",
        type: "string",
        description: "The date the email was sent (ISO string).",
      },
      {
        name: "messageId",
        type: "string",
        description: "The unique message ID of the email.",
      },
      {
        name: "inReplyTo",
        type: "string",
        description: "The message ID this email is a reply to.",
      },
      {
        name: "references",
        type: "json", // Array of strings
        description: "Message IDs in the thread.",
      },
      {
        name: "priority",
        type: "string", // 'high', 'normal', 'low'
        description: "The priority of the email.",
      },
      // Consider adding attachments if needed in the future
      // { name: "attachments", type: "json", description: "List of attachments." },
    ],
  };

  constructor(node: Node) {
    super(node);
  }

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const rawEmail = context.inputs?.rawEmail as string | undefined;

      if (!rawEmail || typeof rawEmail !== "string") {
        throw new Error(
          "Raw email content (string) is required but not provided in the input."
        );
      }

      const parsedEmail: ParsedMail = await simpleParser(rawEmail);

      const output = {
        subject: parsedEmail.subject || "",
        text: parsedEmail.text || "",
        html: parsedEmail.html || "",
        from: formatAddresses(parsedEmail.from),
        to: formatAddresses(parsedEmail.to),
        cc: formatAddresses(parsedEmail.cc),
        bcc: formatAddresses(parsedEmail.bcc),
        replyTo: formatAddresses(parsedEmail.replyTo),
        date: parsedEmail.date ? parsedEmail.date.toISOString() : "",
        messageId: parsedEmail.messageId || "",
        inReplyTo: parsedEmail.inReplyTo || "",
        references: parsedEmail.references
          ? Array.isArray(parsedEmail.references)
            ? parsedEmail.references
            : [parsedEmail.references]
          : [],
        priority: parsedEmail.priority || "normal",
      };

      return this.createSuccessResult(output);
    } catch (error) {
      console.error("EmailParserNode execution error:", error);
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
