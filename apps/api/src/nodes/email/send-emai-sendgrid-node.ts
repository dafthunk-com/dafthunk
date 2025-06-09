import { NodeExecution, NodeType } from "@dafthunk/types";
import sgMail from "@sendgrid/mail";

import { ExecutableNode, NodeContext } from "../types";

export class SendEmailSendgridNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "send-email-sendgrid",
    name: "Send Email (Sendgrid)",
    type: "send-email-sendgrid",
    description: "Send an email using Sendgrid",
    category: "Email",
    icon: "mail",
    inputs: [
      {
        name: "to",
        type: "string",
        description: "Recipient email address",
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
        description: "Email body (HTML or plain text)",
        required: true,
      },
    ],
    outputs: [
      {
        name: "messageId",
        type: "string",
        description: "SendGrid message ID",
        hidden: true,
      },
      {
        name: "status",
        type: "string",
        description: "SendGrid response status",
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
    const apiKey = context.env.SENDGRID_API_KEY;
    const defaultFrom = context.env.SENDGRID_DEFAULT_FROM;
    const triggerFrom = context.emailMessage?.to;

    if (!apiKey) {
      return this.createErrorResult(
        "SendGrid API key is not set in environment variables."
      );
    }
    if (!to || !subject || !body) {
      return this.createErrorResult(
        "'to', 'subject', and 'body' are required inputs."
      );
    }
    const sender = triggerFrom || defaultFrom;
    if (!sender) {
      return this.createErrorResult(
        "No sender address available. Configure a default sender in SENDGRID_DEFAULT_FROM or trigger the workflow via email."
      );
    }

    try {
      sgMail.setApiKey(apiKey);
      const msg = {
        to,
        from: sender,
        subject,
        html: body,
      };
      const [response] = await sgMail.send(msg);
      const messageId =
        response.headers["x-message-id"] ||
        response.headers["X-Message-Id"] ||
        "";
      return this.createSuccessResult({
        messageId,
        status: String(response.statusCode),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
