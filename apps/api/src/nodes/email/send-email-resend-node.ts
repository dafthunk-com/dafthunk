import { NodeExecution, NodeType } from "@dafthunk/types";
import { Resend } from "resend";

import { ExecutableNode, NodeContext } from "../types";

export class SendEmailResendNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "send-email-resend",
    name: "Send Email (Resend)",
    type: "send-email-resend",
    description: "Send an email using Resend",
    tags: ["Social", "Email", "Resend", "Send"],
    icon: "mail",
    documentation:
      "This node sends emails using the Resend email service, supporting HTML content and multiple recipients.",
    computeCost: 10,
    inputs: [
      {
        name: "to",
        type: "string",
        description: "Recipient email address or an array of email addresses",
        required: true,
      },
      {
        name: "subject",
        type: "string",
        description: "Email subject",
        required: true,
      },
      {
        name: "body",
        type: "string",
        description: "Email body (HTML)",
        required: true,
      },
    ],
    outputs: [
      {
        name: "id",
        type: "string",
        description: "Resend email ID",
        hidden: true,
      },
      {
        name: "error",
        type: "string",
        description: "Error message if sending failed",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { to, subject, body } = context.inputs;
    const apiKey = context.env.RESEND_API_KEY;
    const defaultFrom = context.env.RESEND_DEFAULT_FROM;
    const triggerFrom = context.emailMessage?.to;

    if (!apiKey) {
      return this.createErrorResult(
        "Resend API key (RESEND_API_KEY) is not set in environment variables."
      );
    }
    if (!to || !subject || !body) {
      return this.createErrorResult(
        "'to', 'subject', and 'body' (HTML) are required inputs."
      );
    }
    const sender = triggerFrom || defaultFrom;
    if (!sender) {
      return this.createErrorResult(
        "No sender address available. Configure a default sender in RESEND_DEFAULT_FROM or trigger the workflow via email."
      );
    }

    try {
      const resend = new Resend(apiKey);

      const toArray = typeof to === "string" ? [to] : to;

      const { data, error } = await resend.emails.send({
        from: sender,
        to: toArray,
        subject,
        html: body,
      });

      if (error) {
        return this.createErrorResult(
          error.message || "Failed to send email via Resend."
        );
      }

      if (data && data.id) {
        return this.createSuccessResult({
          id: data.id,
        });
      }

      return this.createErrorResult(
        "Failed to send email via Resend. No ID returned."
      );
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
