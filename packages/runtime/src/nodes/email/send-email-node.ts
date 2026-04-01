import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { AwsClient } from "aws4fetch";

export class SendEmailNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "send-email",
    name: "Send Email",
    type: "send-email",
    description: "Send an email using Amazon SES",
    tags: ["Social", "Email", "Send"],
    icon: "mail",
    documentation:
      "This node sends emails using Amazon SES (Simple Email Service), supporting both HTML and plain text content with advanced features.",
    usage: 10,
    subscription: true,
    asTool: true,
    inputs: [
      {
        name: "email",
        type: "email",
        description: "Email to send from",
        required: false,
        hidden: true,
      },
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
    const { email, to, subject, html, text, cc, replyTo } = context.inputs;
    const accessKeyId = context.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = context.env.AWS_SECRET_ACCESS_KEY;
    const region = context.env.AWS_REGION;

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

    // Resolve sender: selected email > trigger email
    let sender: string | undefined;
    if (email && context.emailService) {
      sender = await context.emailService.resolveSender(email as string);
    }
    sender = sender || context.emailMessage?.to;
    if (!sender) {
      return this.createErrorResult(
        "No sender address available. Select an email or trigger the workflow via email."
      );
    }

    try {
      const toArray = typeof to === "string" ? [to] : (to as string[]);
      const ccArray = cc
        ? typeof cc === "string"
          ? [cc]
          : (cc as string[])
        : [];
      const replyToArray = replyTo
        ? typeof replyTo === "string"
          ? [replyTo]
          : (replyTo as string[])
        : [];

      const params = new URLSearchParams();
      params.set("Action", "SendEmail");
      params.set("Source", sender);

      for (let i = 0; i < toArray.length; i++) {
        params.set(
          `Destination.ToAddresses.member.${i + 1}`,
          toArray[i] as string
        );
      }
      for (let i = 0; i < ccArray.length; i++) {
        params.set(
          `Destination.CcAddresses.member.${i + 1}`,
          ccArray[i] as string
        );
      }
      for (let i = 0; i < replyToArray.length; i++) {
        params.set(
          `ReplyToAddresses.member.${i + 1}`,
          replyToArray[i] as string
        );
      }

      params.set("Message.Subject.Data", subject as string);
      params.set("Message.Subject.Charset", "UTF-8");

      if (html) {
        params.set("Message.Body.Html.Data", html as string);
        params.set("Message.Body.Html.Charset", "UTF-8");
      }
      if (text) {
        params.set("Message.Body.Text.Data", text as string);
        params.set("Message.Body.Text.Charset", "UTF-8");
      }

      const client = new AwsClient({ accessKeyId, secretAccessKey });
      const response = await client.fetch(
        `https://email.${region}.amazonaws.com/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        }
      );

      const responseText = await response.text();

      if (!response.ok) {
        const errorMatch = responseText.match(/<Message>(.*?)<\/Message>/);
        const errorMessage = errorMatch?.[1] ?? responseText;
        return this.createErrorResult(
          `AWS SES Error (${response.status}): ${errorMessage}`
        );
      }

      const messageIdMatch = responseText.match(
        /<MessageId>(.*?)<\/MessageId>/
      );
      if (messageIdMatch?.[1]) {
        return this.createSuccessResult({ messageId: messageIdMatch[1] });
      }

      return this.createErrorResult(
        "Failed to send email via Amazon SES. No MessageId returned."
      );
    } catch (error) {
      console.error("SES Error:", error);
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
