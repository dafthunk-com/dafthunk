import { AwsClient } from "aws4fetch";

import type { Bindings } from "../context";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string | string[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Application-level email service for sending transactional emails
 * Uses Amazon SES with the configured noreply address
 */
export class EmailService {
  private client: AwsClient;
  private fromAddress: string;
  private region: string;

  constructor(env: Bindings) {
    if (
      !env.AWS_ACCESS_KEY_ID ||
      !env.AWS_SECRET_ACCESS_KEY ||
      !env.AWS_REGION
    ) {
      throw new Error(
        "AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION) are not configured"
      );
    }

    if (!env.SES_DEFAULT_FROM) {
      throw new Error("SES_DEFAULT_FROM is not configured");
    }

    this.client = new AwsClient({
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    });
    this.region = env.AWS_REGION;
    this.fromAddress = env.SES_DEFAULT_FROM;
  }

  /**
   * Send an email using Amazon SES
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    const { to, subject, html, text, replyTo } = options;

    if (!to || !subject) {
      return {
        success: false,
        error: "'to' and 'subject' are required",
      };
    }

    if (!html && !text) {
      return {
        success: false,
        error: "At least one of 'html' or 'text' body must be provided",
      };
    }

    try {
      const toArray = typeof to === "string" ? [to] : to;
      const replyToArray = replyTo
        ? typeof replyTo === "string"
          ? [replyTo]
          : replyTo
        : [];

      const params = new URLSearchParams();
      params.set("Action", "SendEmail");
      params.set("Source", this.fromAddress);

      for (let i = 0; i < toArray.length; i++) {
        params.set(`Destination.ToAddresses.member.${i + 1}`, toArray[i]);
      }
      for (let i = 0; i < replyToArray.length; i++) {
        params.set(`ReplyToAddresses.member.${i + 1}`, replyToArray[i]);
      }

      params.set("Message.Subject.Data", subject);
      params.set("Message.Subject.Charset", "UTF-8");

      if (html) {
        params.set("Message.Body.Html.Data", html);
        params.set("Message.Body.Html.Charset", "UTF-8");
      }
      if (text) {
        params.set("Message.Body.Text.Data", text);
        params.set("Message.Body.Text.Charset", "UTF-8");
      }

      const response = await this.client.fetch(
        `https://email.${this.region}.amazonaws.com/`,
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
        console.error("Email Service SES Error:", errorMessage);
        return {
          success: false,
          error: `AWS SES Error: ${errorMessage}`,
        };
      }

      const messageIdMatch = responseText.match(
        /<MessageId>(.*?)<\/MessageId>/
      );
      if (messageIdMatch?.[1]) {
        return {
          success: true,
          messageId: messageIdMatch[1],
        };
      }

      return {
        success: false,
        error: "Failed to send email via Amazon SES. No MessageId returned.",
      };
    } catch (error) {
      console.error("Email Service SES Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Create an email service instance from environment bindings
 * Returns null if email is not configured (allows graceful degradation)
 */
export function createEmailService(env: Bindings): EmailService | null {
  try {
    return new EmailService(env);
  } catch (error) {
    console.warn("Email service not available:", error);
    return null;
  }
}
