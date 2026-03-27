import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

import type { Bindings } from "../context";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  replyTo?: string | string[];
}

export interface EmailResult {
  success: boolean;
  error?: string;
}

/**
 * Application-level email service for sending transactional emails
 * Uses Cloudflare Email Routing with the configured noreply address
 */
export class EmailService {
  private sendEmail: SendEmail;
  private fromAddress: string;

  constructor(env: Bindings) {
    if (!env.SEND_EMAIL) {
      throw new Error("SEND_EMAIL binding is not configured");
    }

    this.sendEmail = env.SEND_EMAIL;
    this.fromAddress = `noreply@${env.EMAIL_DOMAIN}`;
  }

  /**
   * Send an email using Cloudflare Email Routing
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    const { to, subject, html, text, cc, replyTo } = options;

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
      const toArray = typeof to === "string" ? [to] : to;

      // Build shared MIME parts once — only the recipient varies per send
      const baseMsg = createMimeMessage();
      baseMsg.setSender({ addr: this.fromAddress, name: "Dafthunk" });
      baseMsg.setSubject(subject);

      if (cc) {
        const ccArray = typeof cc === "string" ? [cc] : cc;
        for (const addr of ccArray) {
          baseMsg.setCc(addr);
        }
      }

      if (replyTo) {
        const replyToArray = typeof replyTo === "string" ? [replyTo] : replyTo;
        baseMsg.setHeader("Reply-To", replyToArray.join(", "));
      }

      if (html) {
        baseMsg.addMessage({ contentType: "text/html", data: html });
      }
      if (text) {
        baseMsg.addMessage({ contentType: "text/plain", data: text });
      }

      await Promise.all(
        toArray.map((recipient) => {
          baseMsg.setRecipient(recipient);
          const message = new EmailMessage(
            this.fromAddress,
            recipient,
            baseMsg.asRaw()
          );
          return this.sendEmail.send(message);
        })
      );

      return { success: true };
    } catch (error) {
      console.error("Email Service Error:", error);
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
