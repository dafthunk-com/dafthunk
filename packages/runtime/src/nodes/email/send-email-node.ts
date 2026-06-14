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
      "This node sends emails using the Cloudflare Email Service binding. When the workflow was triggered by a persisted mailbox address, the message is sent from that address, recorded, and threaded so replies return to the same conversation; otherwise it sends from the platform-owned sender and you can use `replyTo` to direct replies elsewhere.",
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
        description: "Reply-to email address (ignored for mailbox replies)",
        required: false,
      },
      {
        name: "threadId",
        type: "string",
        description:
          "Mailbox thread to attach this reply to. Defaults to the thread of the triggering email.",
        required: false,
        hidden: true,
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
    const { to, subject, html, text, cc, replyTo, threadId } = context.inputs;

    if (!to || !subject) {
      return this.createErrorResult("'to' and 'subject' are required inputs.");
    }

    if (!html && !text) {
      return this.createErrorResult(
        "At least one of 'html' or 'text' body must be provided."
      );
    }

    // Mailbox path: when the workflow was triggered by a persisted address,
    // send from that address and thread the message so the reply returns here.
    const emailId = context.emailMessage?.emailId;
    if (context.mailboxService && emailId && typeof to === "string") {
      try {
        const result = await context.mailboxService.sendThreaded({
          organizationId: context.organizationId,
          emailId,
          to,
          subject: subject as string,
          ...(html ? { html: html as string } : {}),
          ...(text ? { text: text as string } : {}),
          threadId: (threadId as string) ?? context.emailMessage?.threadId,
          inReplyTo: context.emailMessage?.headers?.["message-id"] ?? null,
          references: parseReferences(
            context.emailMessage?.headers?.references
          ),
        });
        return this.createSuccessResult({ messageId: result.messageId });
      } catch (error) {
        console.error("SendEmail (mailbox) error:", error);
        return this.createErrorResult(
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    const sendEmail = context.env.SEND_EMAIL;
    const from = context.env.SEND_EMAIL_FROM;

    if (!sendEmail || !from) {
      return this.createErrorResult(
        "Cloudflare Email Service is not configured (SEND_EMAIL binding or SEND_EMAIL_FROM missing)."
      );
    }

    try {
      const result = await sendEmail.send({
        from,
        to: typeof to === "string" ? to : (to as string[]),
        subject: subject as string,
        ...(html ? { html: html as string } : {}),
        ...(text ? { text: text as string } : {}),
        ...(cc ? { cc: typeof cc === "string" ? cc : (cc as string[]) } : {}),
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

function parseReferences(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
