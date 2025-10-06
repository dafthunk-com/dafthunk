import type { Bindings } from "../context";
import { createDatabase, getAllSecretsWithValues } from "../db";

/**
 * Manages organization secrets for workflow execution.
 * Handles preloading and decryption of secrets.
 */
export class SecretManager {
  constructor(private env: Bindings) {}

  /**
   * Preloads all organization secrets for synchronous access during workflow execution
   */
  async preloadAllSecrets(
    organizationId: string
  ): Promise<Record<string, string>> {
    const secrets: Record<string, string> = {};
    const db = createDatabase(this.env.DB);

    try {
      // Get all secret records for the organization (including encrypted values)
      const secretRecords = await getAllSecretsWithValues(db, organizationId);

      // Decrypt each secret and add to the secrets object
      for (const secretRecord of secretRecords) {
        try {
          const secretValue = await this.decryptSecretValue(
            secretRecord.encryptedValue,
            organizationId
          );
          secrets[secretRecord.name] = secretValue;
        } catch (error) {
          console.warn(
            `Failed to decrypt secret '${secretRecord.name}':`,
            error
          );
        }
      }

      console.log(
        `Preloaded ${Object.keys(secrets).length} secrets for organization ${organizationId}`
      );
    } catch (error) {
      console.error(
        `Failed to preload secrets for organization ${organizationId}:`,
        error
      );
    }

    return secrets;
  }

  /**
   * Decrypt a secret value using organization-specific key
   */
  private async decryptSecretValue(
    encryptedValue: string,
    organizationId: string
  ): Promise<string> {
    // Import decryptSecret here to avoid circular dependency issues
    const { decryptSecret } = await import("../utils/encryption");
    return await decryptSecret(encryptedValue, this.env, organizationId);
  }
}
