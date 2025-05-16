import { NodeExecution, NodeType } from "@dafthunk/types";
import sgMail from "@sendgrid/mail";

import { ExecutableNode, NodeContext } from "../types";

export class SendgridEmailNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "sendgrid-email",
    name: "Sendgrid Email",
    type: "sendgrid-email",
    description: "Send an email using Sendgrid",
    category: "Text",
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
      {
        name: "from",
        type: "string",
        description: "Sender email address (optional, overrides default)",
        hidden: true,
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
    const { to, subject, body, from } = context.inputs;
    const apiKey = context.env.SENDGRID_API_KEY;
    const defaultFrom = context.env.SENDGRID_DEFAULT_FROM;

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
    const sender = from || defaultFrom;
    if (!sender) {
      return this.createErrorResult(
        "No 'from' address provided and SENDGRID_DEFAULT_FROM is not set."
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
