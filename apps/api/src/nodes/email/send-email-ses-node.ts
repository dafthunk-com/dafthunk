import {
  SendEmailCommand,
  SESClient,
  SESServiceException,
} from "@aws-sdk/client-ses";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

export class SendEmailSesNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "send-email-ses",
    name: "Send Email (SES)",
    type: "send-email-ses",
    description: "Send an email using Amazon SES",
    category: "Email",
    icon: "mail",
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
    const { to, subject, html, text, cc, replyTo } = context.inputs;
    const accessKeyId = context.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = context.env.AWS_SECRET_ACCESS_KEY;
    const region = context.env.AWS_REGION;
    const defaultFrom = context.env.SES_DEFAULT_FROM;
    const triggerFrom = context.emailMessage?.to;

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

    const sender = triggerFrom || defaultFrom;
    if (!sender) {
      return this.createErrorResult(
        "No sender address available. Configure a default sender in SES_DEFAULT_FROM or trigger the workflow via email."
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

      // Convert string inputs to arrays if needed
      const toArray = typeof to === "string" ? [to] : to;
      const ccArray = cc ? (typeof cc === "string" ? [cc] : cc) : undefined;
      const replyToArray = replyTo
        ? typeof replyTo === "string"
          ? [replyTo]
          : replyTo
        : undefined;

      // Create the email parameters following AWS documentation structure
      const params = {
        Source: sender,
        Destination: {
          ToAddresses: toArray,
          CcAddresses: ccArray,
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: "UTF-8",
          },
          Body: {
            ...(html && {
              Html: {
                Data: html,
                Charset: "UTF-8",
              },
            }),
            ...(text && {
              Text: {
                Data: text,
                Charset: "UTF-8",
              },
            }),
          },
        },
        ...(replyToArray && { ReplyToAddresses: replyToArray }),
      };

      console.log(
        "Sending email with SES params:",
        JSON.stringify(params, null, 2)
      );

      const command = new SendEmailCommand(params);
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
      console.error("SES Error:", error);
      if (error instanceof SESServiceException) {
        return this.createErrorResult(
          `AWS SES Error: ${error.name} - ${error.message}${
            error.$metadata?.requestId
              ? ` (Request ID: ${error.$metadata.requestId})`
              : ""
          }`
        );
      }
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
