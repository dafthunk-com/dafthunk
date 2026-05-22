import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import PostalMime, { type Address, type Header } from "postal-mime";

type Priority = "high" | "normal" | "low";

const formatAddresses = (addresses: Address | Address[] | undefined) => {
  if (!addresses) return [];
  const arr = Array.isArray(addresses) ? addresses : [addresses];
  return arr.map((a) => ({
    address: a.address || "",
    name: a.name || "",
  }));
};

// postal-mime does not surface a priority field directly. Derive it from the
// standard header set (Importance, X-Priority, Priority) so the node's output
// shape stays drop-in compatible with the previous mailparser-based version.
const getPriority = (headers: Header[] | undefined): Priority => {
  if (!headers) return "normal";
  const lookup = (name: string) =>
    headers.find((h) => h.key.toLowerCase() === name.toLowerCase())?.value;

  const importance = lookup("Importance")?.toLowerCase();
  if (importance === "high" || importance === "low") return importance;

  const xPriority = lookup("X-Priority");
  if (xPriority) {
    const n = Number.parseInt(xPriority, 10);
    if (!Number.isNaN(n)) {
      if (n <= 2) return "high";
      if (n >= 4) return "low";
    }
  }

  const priority = lookup("Priority")?.toLowerCase();
  if (priority === "urgent") return "high";
  if (priority === "non-urgent") return "low";

  return "normal";
};

export class ParseEmailNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "parse-email",
    name: "Parse Email",
    type: "parse-email",
    description:
      "Parses raw email content and extracts key fields like subject, body, sender, and recipients.",
    tags: ["Social", "Email", "Parse"],
    icon: "mail",
    documentation:
      "This node parses raw email content and extracts key fields like subject, body, sender, and recipients. Use the Extract Email Attachments node to get attachments.",
    inlinable: true,
    inputs: [
      {
        name: "raw",
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
        hidden: true,
      },
      {
        name: "replyTo",
        type: "json",
        description: "Reply-to email address(es).",
        hidden: true,
      },
      {
        name: "date",
        type: "string",
        description: "The date the email was sent (ISO string).",
        hidden: true,
      },
      {
        name: "messageId",
        type: "string",
        description: "The unique message ID of the email.",
        hidden: true,
      },
      {
        name: "inReplyTo",
        type: "string",
        description: "The message ID this email is a reply to.",
        hidden: true,
      },
      {
        name: "references",
        type: "json",
        description: "Message IDs in the thread.",
        hidden: true,
      },
      {
        name: "priority",
        type: "string",
        description: "The priority of the email.",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const rawEmail = context.inputs?.raw as string | undefined;

      if (typeof rawEmail !== "string") {
        return this.createErrorResult(
          "Raw email content (string) is required but not provided in the input."
        );
      }

      const parsed = await new PostalMime().parse(rawEmail);

      const references = parsed.references
        ? parsed.references.split(/\s+/).filter(Boolean)
        : [];

      let dateIso = "";
      if (parsed.date) {
        const d = new Date(parsed.date);
        if (!Number.isNaN(d.getTime())) dateIso = d.toISOString();
      }

      const output = {
        subject: parsed.subject || "",
        text: parsed.text || "",
        html: parsed.html || "",
        from: formatAddresses(parsed.from),
        to: formatAddresses(parsed.to),
        cc: formatAddresses(parsed.cc),
        bcc: formatAddresses(parsed.bcc),
        replyTo: formatAddresses(parsed.replyTo),
        date: dateIso,
        messageId: parsed.messageId || "",
        inReplyTo: parsed.inReplyTo || "",
        references,
        priority: getPriority(parsed.headers),
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
