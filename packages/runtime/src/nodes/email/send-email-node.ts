import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class SendEmailNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "send-email",
    name: "Send Email",
    type: "send-email",
    description: "Send an email using Cloudflare Email Service",
    tags: ["Social", "Email", "Send"],
    icon: "mail",
    documentation:
      "This node sends emails using the Cloudflare Email Service binding. Emails are sent from the platform-owned sender configured on the worker; use `replyTo` to direct replies elsewhere.",
    usage: 10,
    subscription: true,
    asTool: true,
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
        name: "html",
        type: "string",
        description: "Email body (HTML)",
        required: false,
      },
      {
        name: "text",
        type: "string",
        description: "Email body (plain text)",
        required: false,
      },
      {
        name: "cc",
        type: "string",
        description: "CC email address or array of addresses",
        required: false,
      },
      {
        name: "replyTo",
        type: "string",
        description: "Reply-to email address",
        required: false,
      },
    ],
    outputs: [
      {
        name: "messageId",
        type: "string",
        description: "Message ID returned by the email service",
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
    const { to, subject, html, text, cc, replyTo } = context.inputs;
    const sendEmail = context.env.SEND_EMAIL;
    const from = context.env.SEND_EMAIL_FROM;

    if (!sendEmail || !from) {
      return this.createErrorResult(
        "Cloudflare Email Service is not configured (SEND_EMAIL binding or SEND_EMAIL_FROM missing)."
      );
    }

    if (!to || !subject) {
      return this.createErrorResult("'to' and 'subject' are required inputs.");
    }

    if (!html && !text) {
      return this.createErrorResult(
        "At least one of 'html' or 'text' body must be provided."
      );
    }

    try {
      const result = await sendEmail.send({
        from,
        to: typeof to === "string" ? to : (to as string[]),
        subject: subject as string,
        ...(html ? { html: html as string } : {}),
        ...(text ? { text: text as string } : {}),
        ...(cc
          ? { cc: typeof cc === "string" ? cc : (cc as string[]) }
          : {}),
        ...(replyTo
          ? {
              replyTo: Array.isArray(replyTo)
                ? (replyTo[0] as string)
                : (replyTo as string),
            }
          : {}),
      });

      return this.createSuccessResult({ messageId: result.messageId });
    } catch (error) {
      console.error("SendEmail error:", error);
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
