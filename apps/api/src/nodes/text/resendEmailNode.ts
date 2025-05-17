import { NodeExecution, NodeType } from "@dafthunk/types";
import { Resend } from "resend";

import { ExecutableNode, NodeContext } from "../types";

export class ResendEmailNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "resend-email",
    name: "Resend Email",
    type: "resend-email",
    description: "Send an email using Resend",
    category: "Text",
    icon: "mail",
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
      {
        name: "from",
        type: "string",
        description: "Sender email address (e.g., 'Acme <onboarding@resend.dev>', optional, overrides default)",
        hidden: true,
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
    const { to, subject, body, from } = context.inputs;
    const apiKey = context.env.RESEND_API_KEY;
    const defaultFrom = context.env.RESEND_DEFAULT_FROM;

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
    const sender = from || defaultFrom;
    if (!sender) {
      return this.createErrorResult(
        "No 'from' address provided and RESEND_DEFAULT_FROM is not set."
      );
    }

    try {
      const resend = new Resend(apiKey);

      const toArray = typeof to === 'string' ? [to] : to;

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
      
      return this.createErrorResult("Failed to send email via Resend. No ID returned.");

    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
} 