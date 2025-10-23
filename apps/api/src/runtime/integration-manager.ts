import type { Bindings } from "../context";
import {
  createDatabase,
  getAllIntegrationsWithTokens,
  updateIntegration,
} from "../db";
import type { IntegrationData } from "./types";

/**
 * Manages organization integrations for workflow execution.
 * Handles preloading and decryption of integration tokens.
 */
export class IntegrationManager {
  private organizationId: string | null = null;

  constructor(private env: Bindings) {}

  /**
   * Preloads all organization integrations for synchronous access during workflow execution.
   * Returns integration data with ISO string timestamps for Cloudflare Workflows serialization.
   */
  async preloadAllIntegrations(
    organizationId: string
  ): Promise<Record<string, IntegrationData>> {
    this.organizationId = organizationId;
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

          integrations[integrationRecord.id] = {
            id: integrationRecord.id,
            name: integrationRecord.name,
            provider: integrationRecord.provider,
            token,
            refreshToken,
            tokenExpiresAt: integrationRecord.tokenExpiresAt?.toISOString(),
            metadata: integrationRecord.metadata
              ? (JSON.parse(integrationRecord.metadata) as Record<string, unknown>)
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

    // Return type is fully JSON-serializable (all Date objects converted to ISO strings)
    return integrations;
  }

  /**
   * Get a valid access token for an integration, refreshing if necessary
   */
  async getValidAccessToken(integrationId: string): Promise<string> {
    if (!this.organizationId) {
      throw new Error(
        "Organization ID not set. Call preloadAllIntegrations first."
      );
    }

    const db = createDatabase(this.env.DB);
    const { getIntegrationById } = await import("../db/queries");

    const integration = await getIntegrationById(
      db,
      integrationId,
      this.organizationId
    );

    if (!integration) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    // Check if token has expired
    const now = new Date();
    const isExpired =
      integration.tokenExpiresAt &&
      new Date(integration.tokenExpiresAt) < now;

    if (!isExpired) {
      // Token is still valid, decrypt and return it
      return this.decryptToken(integration.encryptedToken, this.organizationId);
    }

    // Token expired, need to refresh
    if (!integration.encryptedRefreshToken) {
      throw new Error(
        `Integration ${integrationId} token expired and no refresh token available. User needs to reconnect.`
      );
    }

    const refreshToken = await this.decryptToken(
      integration.encryptedRefreshToken,
      this.organizationId
    );

    // Refresh the token based on provider
    let newTokenData;
    try {
      newTokenData = await this.refreshToken(
        integration.provider,
        refreshToken
      );
    } catch (error) {
      // Refresh token is invalid/expired/revoked
      console.error(
        `Failed to refresh token for integration ${integrationId}:`,
        error
      );

      // Mark integration as expired
      await updateIntegration(
        db,
        integrationId,
        this.organizationId,
        {
          status: "expired",
        },
        this.env
      );

      throw new Error("Integration expired. Please reconnect your account.");
    }

    // Update the integration with new tokens and mark as active
    await updateIntegration(
      db,
      integrationId,
      this.organizationId,
      {
        status: "active",
        token: newTokenData.access_token,
        tokenExpiresAt: new Date(Date.now() + newTokenData.expires_in * 1000),
        // Only update refresh token if a new one was provided
        ...(newTokenData.refresh_token && {
          refreshToken: newTokenData.refresh_token,
        }),
      },
      this.env
    );

    return newTokenData.access_token;
  }

  /**
   * Refresh an OAuth token based on provider
   */
  private async refreshToken(
    provider: string,
    refreshToken: string
  ): Promise<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  }> {
    if (provider === "google-mail") {
      const clientId = this.env.INTEGRATION_GOOGLE_MAIL_CLIENT_ID;
      const clientSecret = this.env.INTEGRATION_GOOGLE_MAIL_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new Error("Google Mail OAuth credentials not configured");
      }
      return this.refreshGoogleToken(refreshToken, clientId, clientSecret);
    }

    if (provider === "google-calendar") {
      const clientId = this.env.INTEGRATION_GOOGLE_CALENDAR_CLIENT_ID;
      const clientSecret = this.env.INTEGRATION_GOOGLE_CALENDAR_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new Error("Google Calendar OAuth credentials not configured");
      }
      return this.refreshGoogleToken(refreshToken, clientId, clientSecret);
    }

    if (provider === "discord") {
      const clientId = this.env.INTEGRATION_DISCORD_CLIENT_ID;
      const clientSecret = this.env.INTEGRATION_DISCORD_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new Error("Discord OAuth credentials not configured");
      }
      return this.refreshDiscordToken(refreshToken, clientId, clientSecret);
    }

    if (provider === "reddit") {
      const clientId = this.env.INTEGRATION_REDDIT_CLIENT_ID;
      const clientSecret = this.env.INTEGRATION_REDDIT_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new Error("Reddit OAuth credentials not configured");
      }
      return this.refreshRedditToken(refreshToken, clientId, clientSecret);
    }

    if (provider === "linkedin") {
      const clientId = this.env.INTEGRATION_LINKEDIN_CLIENT_ID;
      const clientSecret = this.env.INTEGRATION_LINKEDIN_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new Error("LinkedIn OAuth credentials not configured");
      }
      return this.refreshLinkedInToken(refreshToken, clientId, clientSecret);
    }

    throw new Error(`Token refresh not supported for provider: ${provider}`);
  }

  /**
   * Refresh a Google OAuth token
   */
  private async refreshGoogleToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  }> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh Google token: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };

    return {
      access_token: data.access_token,
      expires_in: data.expires_in,
      // Google may return a new refresh token
      refresh_token: data.refresh_token,
    };
  }

  /**
   * Refresh a Discord OAuth token
   */
  private async refreshDiscordToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  }> {
    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh Discord token: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token: string;
    };

    return {
      access_token: data.access_token,
      expires_in: data.expires_in,
      // Discord always returns a new refresh token
      refresh_token: data.refresh_token,
    };
  }

  /**
   * Refresh a Reddit OAuth token
   */
  private async refreshRedditToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  }> {
    const response = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh Reddit token: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };

    return {
      access_token: data.access_token,
      expires_in: data.expires_in,
      // Reddit may return a new refresh token
      refresh_token: data.refresh_token,
    };
  }

  /**
   * Refresh a LinkedIn OAuth token
   */
  private async refreshLinkedInToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  }> {
    const response = await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh LinkedIn token: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };

    return {
      access_token: data.access_token,
      expires_in: data.expires_in,
      // LinkedIn may return a new refresh token
      refresh_token: data.refresh_token,
    };
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

    if (!encryptedToken) {
      throw new Error("Cannot decrypt empty token");
    }

    return await decryptSecret(encryptedToken, this.env, organizationId);
  }
}
