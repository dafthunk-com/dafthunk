import type { Bindings } from "../context";
import {
  createDatabase,
  getAllIntegrationsWithTokens,
  getAllSecretsWithValues,
  getIntegrationById,
  updateIntegration,
} from "../db";
import type { CloudflareToolRegistry } from "../nodes/cloudflare-tool-registry";
import type { HttpRequest, NodeContext } from "../nodes/types";
import type { EmailMessage } from "../nodes/types";
import {
  refreshOAuthToken,
  shouldRefreshToken,
  supportsTokenRefresh,
  TokenRefreshError,
} from "../utils/oauth";
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

    // For providers without expiring tokens (GitHub), return current token
    if (!supportsTokenRefresh(provider)) {
      return this.decryptSecret(encryptedToken, this.organizationId);
    }

    // If token is still valid, return it
    if (!shouldRefreshToken(tokenExpiresAt)) {
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

      const result = await refreshOAuthToken(
        provider,
        currentRefreshToken,
        this.env
      );

      console.log(`[OAuth] Token refreshed: ${provider} (${integrationId})`);

      // Update integration with new tokens
      await updateIntegration(
        db,
        integrationId,
        this.organizationId,
        {
          status: "active",
          token: result.accessToken,
          tokenExpiresAt: new Date(Date.now() + result.expiresIn * 1000),
          ...(result.refreshToken && { refreshToken: result.refreshToken }),
        },
        this.env
      );

      return result.accessToken;
    } catch (error) {
      console.error(
        `[OAuth] Failed to refresh: ${provider} (${integrationId})`,
        error instanceof TokenRefreshError ? error.message : error
      );

      await this.markIntegrationExpired(db, integrationId);
      throw new Error(
        "Integration has expired. Please reconnect in settings."
      );
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
