import type { Bindings } from "../context";
import { createDatabase, getAllIntegrationsWithTokens } from "../db";

/**
 * Manages organization integrations for workflow execution.
 * Handles preloading and decryption of integration tokens.
 */
export class IntegrationManager {
  constructor(private env: Bindings) {}

  /**
   * Preloads all organization integrations for synchronous access during workflow execution
   */
  async preloadAllIntegrations(
    organizationId: string
  ): Promise<Record<string, IntegrationData>> {
    const integrations: Record<string, IntegrationData> = {};
    const db = createDatabase(this.env.DB);

    try {
      // Get all integration records for the organization (including encrypted tokens)
      const integrationRecords = await getAllIntegrationsWithTokens(
        db,
        organizationId
      );

      // Decrypt each integration token and add to the integrations object
      for (const integrationRecord of integrationRecords) {
        try {
          const token = await this.decryptToken(
            integrationRecord.encryptedToken,
            organizationId
          );

          let refreshToken: string | undefined;
          if (integrationRecord.encryptedRefreshToken) {
            refreshToken = await this.decryptToken(
              integrationRecord.encryptedRefreshToken,
              organizationId
            );
          }

          integrations[integrationRecord.name] = {
            provider: integrationRecord.provider,
            token,
            refreshToken,
            tokenExpiresAt: integrationRecord.tokenExpiresAt || undefined,
            metadata: integrationRecord.metadata
              ? JSON.parse(integrationRecord.metadata)
              : undefined,
          };
        } catch (error) {
          console.warn(
            `Failed to decrypt integration '${integrationRecord.name}':`,
            error
          );
        }
      }

      console.log(
        `Preloaded ${Object.keys(integrations).length} integrations for organization ${organizationId}`
      );
    } catch (error) {
      console.error(
        `Failed to preload integrations for organization ${organizationId}:`,
        error
      );
    }

    return integrations;
  }

  /**
   * Decrypt a token using organization-specific key
   */
  private async decryptToken(
    encryptedToken: string,
    organizationId: string
  ): Promise<string> {
    // Import decryptSecret here to avoid circular dependency issues
    const { decryptSecret } = await import("../utils/encryption");
    return await decryptSecret(encryptedToken, this.env, organizationId);
  }
}

/**
 * Integration data structure available at runtime
 */
export interface IntegrationData {
  provider: string;
  token: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  metadata?: Record<string, any>;
}
