import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import PostalMime from "postal-mime";

export class ExtractEmailAttachmentsNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "extract-email-attachments",
    name: "Extract Email Attachments",
    type: "extract-email-attachments",
    description:
      "Extracts attachments from raw email content as blobs with filename and mime type.",
    tags: ["Social", "Email", "Parse"],
    icon: "paperclip",
    documentation:
      "This node parses raw email content and extracts all attachments as blobs. Each attachment includes the binary data, mime type, and original filename.",
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
        name: "attachments",
        type: "blob",
        description:
          "Email attachments as blobs with data, mimeType, and filename.",
        repeated: true,
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

      const attachments = (parsed.attachments || []).map((att) => ({
        data: toUint8Array(att.content),
        mimeType: att.mimeType || "application/octet-stream",
        filename: att.filename || "",
      }));

      return this.createSuccessResult({ attachments });
    } catch (error) {
      console.error("ExtractEmailAttachmentsNode execution error:", error);
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}

function toUint8Array(content: ArrayBuffer | Uint8Array | string): Uint8Array {
  if (content instanceof Uint8Array) return content;
  if (content instanceof ArrayBuffer) return new Uint8Array(content);
  return new TextEncoder().encode(content);
}
