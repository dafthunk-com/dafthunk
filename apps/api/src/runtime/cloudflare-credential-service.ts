import type {
  CredentialService,
  DatabaseService,
  DatasetService,
  IntegrationData,
  NodeContext,
  QueueService,
  WorkflowExecutionContext,
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
import { CloudflareObjectStore } from "./cloudflare-object-store";
import type { CloudflareToolRegistry } from "./cloudflare-tool-registry";

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

  constructor(
    private env: Bindings,
    private toolRegistry: CloudflareToolRegistry,
    private databaseService?: DatabaseService,
    private datasetService?: DatasetService,
    private queueService?: QueueService
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
    context: WorkflowExecutionContext,
    inputs: Record<string, unknown>
  ): NodeContext {
    const {
      workflowId,
      organizationId,
      deploymentId,
      httpRequest,
      emailMessage,
      queueMessage,
      scheduledTrigger,
    } = context;

    // Configure AI Gateway options
    const aiOptions: AiOptions = {};
    const gatewayId = this.env.CLOUDFLARE_AI_GATEWAY_ID;
    if (gatewayId) {
      aiOptions.gateway = {
        id: gatewayId,
        skipCache: false,
      };
    }

    // Build ObjectStore with presigned URL support when R2 credentials are available
    const {
      CLOUDFLARE_ACCOUNT_ID,
      R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY,
      R2_BUCKET_NAME,
    } = this.env;
    const presignedUrlConfig =
      CLOUDFLARE_ACCOUNT_ID &&
      R2_ACCESS_KEY_ID &&
      R2_SECRET_ACCESS_KEY &&
      R2_BUCKET_NAME
        ? {
            accountId: CLOUDFLARE_ACCOUNT_ID,
            bucketName: R2_BUCKET_NAME,
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
          }
        : undefined;
    const objectStore = new CloudflareObjectStore(
      this.env.RESSOURCES,
      presignedUrlConfig
    );

    return {
      nodeId,
      workflowId,
      organizationId,
      mode: deploymentId ? "prod" : "dev",
      deploymentId,
      inputs,
      httpRequest,
      emailMessage,
      queueMessage,
      scheduledTrigger,
      onProgress: () => {},
      toolRegistry: this.toolRegistry,
      objectStore,
      databaseService: this.databaseService,
      datasetService: this.datasetService,
      queueService: this.queueService,
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
      env: this.env,
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
      mode: "dev",
      inputs,
      toolRegistry: this.toolRegistry,
      objectStore: new CloudflareObjectStore(this.env.RESSOURCES),
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
      env: this.env,
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
