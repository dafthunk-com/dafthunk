import type { Bindings } from "../context";
import type { CloudflareToolRegistry } from "../nodes/cloudflare-tool-registry";
import type { HttpRequest, NodeContext } from "../nodes/types";
import type { EmailMessage } from "../nodes/types";
import { createDatabase, getAllIntegrationsWithTokens, getAllSecretsWithValues, updateIntegration, getIntegrationById } from "../db";
import type { IntegrationData } from "./types";

/**
 * Provides unified access to organization resources (secrets and integrations).
 * Hides complexity of preloading, encryption/decryption, and token refresh.
 *
 * Deep module: Simple API that manages rich internal logic for resource access.
 */
export class ResourceProvider {
  private organizationId: string | null = null;
  private secrets: Record<string, string> = {};
  private integrations: Record<string, IntegrationData> = {};

  constructor(
    private env: Bindings,
    private toolRegistry: CloudflareToolRegistry
  ) {}

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
      console.log(
        `Preloaded ${Object.keys(this.secrets).length} secrets for organization ${organizationId}`
      );
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
  }

  /**
   * Creates a NodeContext for node execution with access to secrets and integrations.
   * Single place for NodeContext creation - hides resource access complexity.
   */
  createNodeContext(
    nodeId: string,
    workflowId: string,
    organizationId: string,
    inputs: Record<string, unknown>,
    httpRequest?: HttpRequest,
    emailMessage?: EmailMessage
  ): NodeContext {
    // Configure AI Gateway options
    const aiOptions: AiOptions = {};
    const gatewayId = this.env.CLOUDFLARE_AI_GATEWAY_ID;
    if (gatewayId) {
      aiOptions.gateway = {
        id: gatewayId,
        skipCache: false,
      };
    }

    return {
      nodeId,
      workflowId,
      organizationId,
      inputs,
      httpRequest,
      emailMessage,
      onProgress: () => {},
      toolRegistry: this.toolRegistry,
      // Callback-based access to secrets (lazy, secure)
      getSecret: async (secretName: string) => {
        return this.secrets?.[secretName];
      },
      // Callback-based access to integrations (lazy, auto-refreshing)
      getIntegration: async (integrationId: string) => {
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
      },
      env: {
        DB: this.env.DB,
        AI: this.env.AI,
        AI_OPTIONS: aiOptions,
        RESSOURCES: this.env.RESSOURCES,
        DATASETS: this.env.DATASETS,
        DATASETS_AUTORAG: this.env.DATASETS_AUTORAG,
        CLOUDFLARE_ACCOUNT_ID: this.env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: this.env.CLOUDFLARE_API_TOKEN,
        CLOUDFLARE_AI_GATEWAY_ID: this.env.CLOUDFLARE_AI_GATEWAY_ID,
        TWILIO_ACCOUNT_SID: this.env.TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN: this.env.TWILIO_AUTH_TOKEN,
        TWILIO_PHONE_NUMBER: this.env.TWILIO_PHONE_NUMBER,
        SENDGRID_API_KEY: this.env.SENDGRID_API_KEY,
        SENDGRID_DEFAULT_FROM: this.env.SENDGRID_DEFAULT_FROM,
        RESEND_API_KEY: this.env.RESEND_API_KEY,
        RESEND_DEFAULT_FROM: this.env.RESEND_DEFAULT_FROM,
        AWS_ACCESS_KEY_ID: this.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: this.env.AWS_SECRET_ACCESS_KEY,
        AWS_REGION: this.env.AWS_REGION,
        SES_DEFAULT_FROM: this.env.SES_DEFAULT_FROM,
        EMAIL_DOMAIN: this.env.EMAIL_DOMAIN,
        OPENAI_API_KEY: this.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: this.env.ANTHROPIC_API_KEY,
        GEMINI_API_KEY: this.env.GEMINI_API_KEY,
        HUGGINGFACE_API_KEY: this.env.HUGGINGFACE_API_KEY,
      },
    };
  }

  /**
   * Creates a NodeContext for tool execution (system-level, no org resources)
   */
  createToolContext(
    nodeId: string,
    inputs: Record<string, unknown>
  ): NodeContext {
    // Configure AI Gateway options
    const aiOptions: AiOptions = {};
    const gatewayId = this.env.CLOUDFLARE_AI_GATEWAY_ID;
    if (gatewayId) {
      aiOptions.gateway = {
        id: gatewayId,
        skipCache: false,
      };
    }

    return {
      nodeId,
      workflowId: `tool_execution_${Date.now()}`,
      organizationId: "system",
      inputs,
      toolRegistry: this.toolRegistry,
      // Tool executions don't have access to organization secrets/integrations
      getSecret: async (secretName: string) => {
        throw new Error(
          `Secret access not available in tool execution context. Secret '${secretName}' cannot be accessed.`
        );
      },
      getIntegration: async (integrationId: string) => {
        throw new Error(
          `Integration access not available in tool execution context. Integration '${integrationId}' cannot be accessed.`
        );
      },
      env: {
        DB: this.env.DB,
        AI: this.env.AI,
        AI_OPTIONS: aiOptions,
        RESSOURCES: this.env.RESSOURCES,
        DATASETS: this.env.DATASETS,
        DATASETS_AUTORAG: this.env.DATASETS_AUTORAG,
        CLOUDFLARE_ACCOUNT_ID: this.env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: this.env.CLOUDFLARE_API_TOKEN,
        CLOUDFLARE_AI_GATEWAY_ID: this.env.CLOUDFLARE_AI_GATEWAY_ID,
        TWILIO_ACCOUNT_SID: this.env.TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN: this.env.TWILIO_AUTH_TOKEN,
        TWILIO_PHONE_NUMBER: this.env.TWILIO_PHONE_NUMBER,
        SENDGRID_API_KEY: this.env.SENDGRID_API_KEY,
        SENDGRID_DEFAULT_FROM: this.env.SENDGRID_DEFAULT_FROM,
        RESEND_API_KEY: this.env.RESEND_API_KEY,
        RESEND_DEFAULT_FROM: this.env.RESEND_DEFAULT_FROM,
        AWS_ACCESS_KEY_ID: this.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: this.env.AWS_SECRET_ACCESS_KEY,
        AWS_REGION: this.env.AWS_REGION,
        SES_DEFAULT_FROM: this.env.SES_DEFAULT_FROM,
        EMAIL_DOMAIN: this.env.EMAIL_DOMAIN,
        OPENAI_API_KEY: this.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: this.env.ANTHROPIC_API_KEY,
        GEMINI_API_KEY: this.env.GEMINI_API_KEY,
        HUGGINGFACE_API_KEY: this.env.HUGGINGFACE_API_KEY,
      },
    };
  }

  /**
   * Get a valid access token for an integration, refreshing if necessary.
   * Internal method - token refresh complexity hidden from callers.
   */
  private async getValidAccessToken(integrationId: string): Promise<string> {
    if (!this.organizationId) {
      throw new Error(
        "Organization ID not set. Call initialize first."
      );
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

    // Check if token has expired
    const now = new Date();
    const isExpired =
      integration.tokenExpiresAt &&
      new Date(integration.tokenExpiresAt) < now;

    if (!isExpired) {
      // Token is still valid, decrypt and return it
      return this.decryptSecret(integration.encryptedToken, this.organizationId);
    }

    // Token expired, need to refresh
    if (!integration.encryptedRefreshToken) {
      throw new Error(
        `Integration ${integrationId} token expired and no refresh token available. User needs to reconnect.`
      );
    }

    const refreshToken = await this.decryptSecret(
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
