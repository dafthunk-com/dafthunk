import { AwsClient } from "aws4fetch";

import type { Bindings } from "../context";

export type SesVerificationStatus =
  | "Success"
  | "Pending"
  | "Failed"
  | "TemporaryFailure"
  | "NotStarted";

/**
 * Service for managing SES email identity verification.
 * Allows organizations to verify their own sender email addresses.
 */
export class SesVerificationService {
  private client: AwsClient;
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

    this.client = new AwsClient({
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    });
    this.region = env.AWS_REGION;
  }

  /**
   * Request SES to send a verification email to the given address.
   * The recipient must click the link in the email to complete verification.
   */
  async verifyEmailIdentity(email: string): Promise<void> {
    const params = new URLSearchParams();
    params.set("Action", "VerifyEmailIdentity");
    params.set("EmailAddress", email);

    const response = await this.client.fetch(
      `https://email.${this.region}.amazonaws.com/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const responseText = await response.text();
      const errorMatch = responseText.match(/<Message>(.*?)<\/Message>/);
      const errorMessage = errorMatch?.[1] ?? responseText;
      throw new Error(
        `SES VerifyEmailIdentity failed (${response.status}): ${errorMessage}`
      );
    }
  }

  /**
   * Check the verification status of an email identity in SES.
   * Returns the SES-reported status, or "NotStarted" if the identity is unknown.
   */
  async getVerificationStatus(email: string): Promise<SesVerificationStatus> {
    const params = new URLSearchParams();
    params.set("Action", "GetIdentityVerificationAttributes");
    params.set("Identities.member.1", email);

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
      throw new Error(
        `SES GetIdentityVerificationAttributes failed (${response.status}): ${errorMessage}`
      );
    }

    const statusMatch = responseText.match(
      /<VerificationStatus>(.*?)<\/VerificationStatus>/
    );
    if (!statusMatch?.[1]) {
      return "NotStarted";
    }

    return statusMatch[1] as SesVerificationStatus;
  }

  /**
   * Delete an email identity from SES.
   */
  async deleteIdentity(email: string): Promise<void> {
    const params = new URLSearchParams();
    params.set("Action", "DeleteIdentity");
    params.set("Identity", email);

    const response = await this.client.fetch(
      `https://email.${this.region}.amazonaws.com/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const responseText = await response.text();
      const errorMatch = responseText.match(/<Message>(.*?)<\/Message>/);
      const errorMessage = errorMatch?.[1] ?? responseText;
      throw new Error(
        `SES DeleteIdentity failed (${response.status}): ${errorMessage}`
      );
    }
  }
}

/**
 * Create an SES verification service instance from environment bindings.
 * Returns null if AWS credentials are not configured.
 */
export function createSesVerificationService(
  env: Bindings
): SesVerificationService | null {
  try {
    return new SesVerificationService(env);
  } catch {
    return null;
  }
}
