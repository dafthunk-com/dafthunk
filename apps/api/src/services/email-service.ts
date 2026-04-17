import type { Bindings } from "../context";

export interface EmailOptions {
  from?: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Application-level email service for sending transactional emails
 * via the Cloudflare Email Service binding.
 */
export class EmailService {
  private binding: SendEmail;
  private fromAddress: string;

  constructor(env: Bindings) {
    if (!env.SEND_EMAIL) {
      throw new Error("SEND_EMAIL binding is not configured");
    }
    if (!env.SEND_EMAIL_FROM) {
      throw new Error("SEND_EMAIL_FROM is not configured");
    }
    this.binding = env.SEND_EMAIL;
    this.fromAddress = env.SEND_EMAIL_FROM;
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    const { from, to, subject, html, text, replyTo } = options;

    if (!to || !subject) {
      return { success: false, error: "'to' and 'subject' are required" };
    }

    if (!html && !text) {
      return {
        success: false,
        error: "At least one of 'html' or 'text' body must be provided",
      };
    }

    try {
      const result = await this.binding.send({
        from: from ?? this.fromAddress,
        to,
        subject,
        ...(html ? { html } : {}),
        ...(text ? { text } : {}),
        ...(replyTo ? { replyTo } : {}),
      });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("Email Service error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Create an email service instance from environment bindings.
 * Returns null if email is not configured (allows graceful degradation).
 */
export function createEmailService(env: Bindings): EmailService | null {
  try {
    return new EmailService(env);
  } catch (error) {
    console.warn("Email service not available:", error);
    return null;
  }
}
