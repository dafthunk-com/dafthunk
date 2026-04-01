import type { EmailService } from "@dafthunk/runtime";

import type { Bindings } from "../context";
import { createDatabase, getEmailById } from "../db";

/**
 * Cloudflare-backed EmailService.
 * Resolves the sender address for an email, returning the
 * verified custom sender if available, or the internal address.
 */
export class CloudflareEmailService implements EmailService {
  private emailDomain: string;

  constructor(private env: Pick<Bindings, "DB" | "EMAIL_DOMAIN">) {
    this.emailDomain = env.EMAIL_DOMAIN || "dafthunk.com";
  }

  async resolveSender(emailId: string): Promise<string> {
    const db = createDatabase(this.env.DB);
    const record = await getEmailById(db, emailId);
    if (record?.senderEmailStatus === "verified" && record.senderEmail) {
      return record.senderEmail;
    }
    return `${emailId}@${this.emailDomain}`;
  }
}
