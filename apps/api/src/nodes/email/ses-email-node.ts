import { NodeExecution, NodeType } from "@dafthunk/types";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

import { ExecutableNode, NodeContext } from "../types";

function validateEmailDomain(email: string, allowedDomain: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain === allowedDomain.toLowerCase();
}

export class SESEmailNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "ses-email",
    name: "Amazon SES Email",
    type: "ses-email",
    description: "Send an email using Amazon SES",
    category: "Email",
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
        description: "SES message ID",
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
    const { to, subject, html, text, from } = context.inputs;
    const accessKeyId = context.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = context.env.AWS_SECRET_ACCESS_KEY;
    const region = context.env.AWS_REGION;
    const defaultFrom = context.env.SES_DEFAULT_FROM;
    const allowedDomain = context.env.EMAIL_DOMAIN;

    if (!accessKeyId || !secretAccessKey || !region) {
      return this.createErrorResult(
        "AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION) are not set in environment variables."
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

    const sender = from || defaultFrom;
    if (!sender) {
      return this.createErrorResult(
        "No 'from' address provided and SES_DEFAULT_FROM is not set."
      );
    }

    if (!validateEmailDomain(sender, allowedDomain)) {
      return this.createErrorResult(
        `Sender email domain must be ${allowedDomain}`
      );
    }

    try {
      const sesClient = new SESClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const toArray = typeof to === "string" ? [to] : to;

      const messageBody: any = {};
      if (html) {
        messageBody.Html = {
          Data: html,
          Charset: "UTF-8",
        };
      }
      if (text) {
        messageBody.Text = {
          Data: text,
          Charset: "UTF-8",
        };
      }

      const command = new SendEmailCommand({
        Source: sender,
        Destination: {
          ToAddresses: toArray,
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: "UTF-8",
          },
          Body: messageBody,
        },
      });

      const response = await sesClient.send(command);

      if (response.MessageId) {
        return this.createSuccessResult({
          messageId: response.MessageId,
        });
      }

      return this.createErrorResult(
        "Failed to send email via Amazon SES. No MessageId returned."
      );
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
