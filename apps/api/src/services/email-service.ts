import {
  SESClient,
  SESServiceException,
  SendEmailCommand,
} from "@aws-sdk/client-ses";

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
  private sesClient: SESClient;
  private fromAddress: string;

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

    this.sesClient = new SESClient({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });

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
        : undefined;

      const params = {
        Source: this.fromAddress,
        Destination: {
          ToAddresses: toArray,
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

      const command = new SendEmailCommand(params);
      const response = await this.sesClient.send(command);

      if (response.MessageId) {
        return {
          success: true,
          messageId: response.MessageId,
        };
      }

      return {
        success: false,
        error: "Failed to send email via Amazon SES. No MessageId returned.",
      };
    } catch (error) {
      console.error("Email Service SES Error:", error);

      if (error instanceof SESServiceException) {
        return {
          success: false,
          error: `AWS SES Error: ${error.name} - ${error.message}`,
        };
      }

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
