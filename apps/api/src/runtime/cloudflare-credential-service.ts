import type {
  CredentialService,
  IntegrationData,
  IntegrationInfo,
} from "@dafthunk/runtime";

import type { Bindings } from "../context";
import {
  createDatabase,
  getAllIntegrationsWithTokens,
  getAllSecretsWithValues,
  getIntegrationById,
  updateIntegration,
} from "../db";
import { getProvider } from "../oauth";

/**
 * Cloudflare-backed implementation of CredentialService.
 * Provides unified access to organization credentials (secrets and integrations).
 * Hides complexity of preloading, encryption/decryption, and token refresh.
 *
 * Deep module: Simple API that manages rich internal logic for credential access.
 */
export class CloudflareCredentialService implements CredentialService {
  private organizationId: string | null = null;
  private secrets: Record<string, string> = {};
  private integrations: Record<string, IntegrationData> = {};

  constructor(private env: Bindings) {}

  getOrganizationId(): string {
    if (!this.organizationId) {
      throw new Error("Credential service not initialized");
    }
    return this.organizationId;
  }

  /**
   * Preloads all organization secrets and integrations for synchronous access.
   * Single initialization step that replaces separate secret/integration preloading.
   */
  async initialize(organizationId: string): Promise<void> {
    this.organizationId = organizationId;
    const db = createDatabase(this.env.DB);

    // Preload secrets
    try {
      const secretRecords = await getAllSecretsWithValues(db, organizationId);
      for (const secretRecord of secretRecords) {
        try {
          const secretValue = await this.decryptSecret(
            secretRecord.encryptedValue,
            organizationId
          );
          this.secrets[secretRecord.name] = secretValue;
        } catch (error) {
          console.warn(
            `Failed to decrypt secret '${secretRecord.name}':`,
            error
          );
        }
      }
    } catch (error) {
      console.error(
        `Failed to preload secrets for organization ${organizationId}:`,
        error
      );
    }

    // Preload integrations
    try {
      const integrationRecords = await getAllIntegrationsWithTokens(
        db,
        organizationId
      );

      for (const integrationRecord of integrationRecords) {
        try {
          const token = await this.decryptSecret(
            integrationRecord.encryptedToken,
            organizationId
          );

          let refreshToken: string | undefined;
          if (integrationRecord.encryptedRefreshToken) {
            refreshToken = await this.decryptSecret(
              integrationRecord.encryptedRefreshToken,
              organizationId
            );
          }

          this.integrations[integrationRecord.id] = {
            id: integrationRecord.id,
            name: integrationRecord.name,
            provider: integrationRecord.provider,
            token,
            refreshToken,
            tokenExpiresAt: integrationRecord.tokenExpiresAt?.toISOString(),
            metadata: integrationRecord.metadata
              ? (JSON.parse(integrationRecord.metadata) as Record<
                  string,
                  unknown
                >)
              : undefined,
          };
        } catch (error) {
          console.warn(
            `Failed to decrypt integration '${integrationRecord.name}':`,
            error
          );
        }
      }
    } catch (error) {
      console.error(
        `Failed to preload integrations for organization ${organizationId}:`,
        error
      );
    }
  }

  /**
   * Get a secret value by name from the preloaded secrets.
   */
  async getSecret(secretName: string): Promise<string | undefined> {
    return this.secrets?.[secretName];
  }

  /**
   * Get integration info by ID, automatically refreshing tokens if needed.
   */
  async getIntegration(integrationId: string): Promise<IntegrationInfo> {
    const integration = this.integrations?.[integrationId];
    if (!integration) {
      throw new Error(
        `Integration '${integrationId}' not found or access denied. Please check your integration settings.`
      );
    }

    // Automatically refresh token if needed
    const token = await this.getValidAccessToken(integrationId);

    return {
      id: integration.id,
      name: integration.name,
      provider: integration.provider,
      token,
      metadata: integration.metadata,
    };
  }

  /**
   * Get a valid access token for an integration, refreshing if necessary.
   * Proactive refresh: refreshes 5 minutes before expiration to avoid failures.
   */
  private async getValidAccessToken(integrationId: string): Promise<string> {
    if (!this.organizationId) {
      throw new Error("Organization not initialized");
    }

    const db = createDatabase(this.env.DB);
    const integration = await getIntegrationById(
      db,
      integrationId,
      this.organizationId
    );

    if (!integration) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    const { provider, encryptedToken, encryptedRefreshToken, tokenExpiresAt } =
      integration;

    // Get provider instance
    const oauthProvider = getProvider(provider);

    // For providers without expiring tokens (GitHub), return current token
    if (!oauthProvider.refreshEnabled) {
      return this.decryptSecret(encryptedToken, this.organizationId);
    }

    // If token is still valid, return it
    if (!oauthProvider.needsRefresh(tokenExpiresAt ?? undefined)) {
      return this.decryptSecret(encryptedToken, this.organizationId);
    }

    // Token needs refresh
    if (!encryptedRefreshToken) {
      await this.markIntegrationExpired(db, integrationId);
      throw new Error(
        `Integration ${integrationId} has expired. Please reconnect in settings.`
      );
    }

    // Decrypt refresh token and refresh
    const currentRefreshToken = await this.decryptSecret(
      encryptedRefreshToken,
      this.organizationId
    );

    try {
      console.log(`[OAuth] Refreshing token: ${provider} (${integrationId})`);

      // Get client credentials for the provider
      const { clientId, clientSecret } = oauthProvider.getClientCredentials(
        this.env
      );

      const result = await oauthProvider.refreshToken(
        currentRefreshToken,
        clientId,
        clientSecret
      );

      console.log(`[OAuth] Token refreshed: ${provider} (${integrationId})`);

      // Extract token data using provider's methods (handles snake_case conversion)
      const newAccessToken = oauthProvider.extractAccessToken(result);
      const newRefreshToken = oauthProvider.extractRefreshToken(result);
      const newExpiresAt = oauthProvider.extractExpiresAt(result);

      // Update integration with new tokens
      await updateIntegration(
        db,
        integrationId,
        this.organizationId,
        {
          status: "active",
          token: newAccessToken,
          tokenExpiresAt: newExpiresAt,
          ...(newRefreshToken && { refreshToken: newRefreshToken }),
        },
        this.env
      );

      return newAccessToken;
    } catch (error) {
      console.error(
        `[OAuth] Failed to refresh: ${provider} (${integrationId})`,
        error
      );

      await this.markIntegrationExpired(db, integrationId);
      throw new Error("Integration has expired. Please reconnect in settings.");
    }
  }

  /**
   * Mark an integration as expired
   */
  private async markIntegrationExpired(
    db: ReturnType<typeof createDatabase>,
    integrationId: string
  ): Promise<void> {
    if (!this.organizationId) return;

    await updateIntegration(
      db,
      integrationId,
      this.organizationId,
      { status: "expired" },
      this.env
    );
  }

  /**
   * Decrypt a secret value using organization-specific key
   */
  private async decryptSecret(
    encryptedValue: string,
    organizationId: string
  ): Promise<string> {
    // Import decryptSecret here to avoid circular dependency issues
    const { decryptSecret } = await import("../utils/encryption");

    if (!encryptedValue) {
      throw new Error("Cannot decrypt empty value");
    }

    return await decryptSecret(encryptedValue, this.env, organizationId);
  }
}
