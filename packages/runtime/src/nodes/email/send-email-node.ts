import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

export class SendEmailNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "send-email",
    name: "Send Email",
    type: "send-email",
    description: "Send an email using Cloudflare Email Routing",
    tags: ["Social", "Email", "Send"],
    icon: "mail",
    documentation:
      "This node sends emails using Cloudflare Email Routing, supporting both HTML and plain text content.",
    usage: 10,
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
        description: "Reply-to email address or array of addresses",
        required: false,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "Whether the email was sent successfully",
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
    const emailDomain = context.env.EMAIL_DOMAIN;
    const triggerFrom = context.emailMessage?.to;

    if (!sendEmail) {
      return this.createErrorResult(
        "SEND_EMAIL binding is not configured in the environment."
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

    const sender = triggerFrom || (emailDomain ? `noreply@${emailDomain}` : "");
    if (!sender) {
      return this.createErrorResult(
        "No sender address available. Configure EMAIL_DOMAIN or trigger the workflow via email."
      );
    }

    try {
      const toArray = typeof to === "string" ? [to] : (to as string[]);

      // Build shared MIME parts once — only the recipient varies per send
      const baseMsg = createMimeMessage();
      baseMsg.setSender({ addr: sender, name: "Dafthunk" });
      baseMsg.setSubject(subject as string);

      if (cc) {
        const ccArray = typeof cc === "string" ? [cc] : (cc as string[]);
        for (const addr of ccArray) {
          baseMsg.setCc(addr);
        }
      }

      if (replyTo) {
        const replyToArray =
          typeof replyTo === "string" ? [replyTo] : (replyTo as string[]);
        baseMsg.setHeader("Reply-To", replyToArray.join(", "));
      }

      if (html) {
        baseMsg.addMessage({ contentType: "text/html", data: html as string });
      }
      if (text) {
        baseMsg.addMessage({
          contentType: "text/plain",
          data: text as string,
        });
      }

      await Promise.all(
        toArray.map((recipient) => {
          baseMsg.setRecipient(recipient);
          const message = new EmailMessage(
            sender,
            recipient,
            baseMsg.asRaw()
          );
          return sendEmail.send(message);
        })
      );

      return this.createSuccessResult({ success: true });
    } catch (error) {
      console.error("Send Email Error:", error);
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
