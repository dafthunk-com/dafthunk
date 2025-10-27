/**
 * OAuth Token Refresh Utilities
 *
 * Clean, config-driven approach to OAuth token refresh supporting:
 * - Proactive refresh (5 min buffer before expiration)
 * - Token rotation (OAuth 2.0 best practice)
 * - Retry with exponential backoff
 * - Provider-specific configurations
 */

import type { Bindings } from "../context";

/**
 * OAuth token refresh result
 */
export interface TokenRefreshResult {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string; // Returned when provider supports rotation
}

/**
 * OAuth provider configuration
 */
interface ProviderConfig {
  name: string;
  tokenEndpoint: string;
  supportsRefresh: boolean;
  getClientCredentials: (env: Bindings) => { clientId: string; clientSecret: string };
  buildRequestBody: (params: {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  }) => URLSearchParams;
  getAuthHeader?: (params: {
    clientId: string;
    clientSecret: string;
  }) => string;
  additionalHeaders?: Record<string, string>;
}

/**
 * Token refresh error with provider context
 */
export class TokenRefreshError extends Error {
  constructor(
    public readonly provider: string,
    message: string,
    public readonly statusCode?: number,
    public readonly responseBody?: string
  ) {
    super(`Token refresh failed for ${provider}: ${message}`);
    this.name = "TokenRefreshError";
  }
}

/**
 * Provider configurations
 * Clean, declarative config for each OAuth provider
 */
const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  "google-mail": {
    name: "google-mail",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    supportsRefresh: true,
    getClientCredentials: (env) => ({
      clientId: env.INTEGRATION_GOOGLE_MAIL_CLIENT_ID!,
      clientSecret: env.INTEGRATION_GOOGLE_MAIL_CLIENT_SECRET!,
    }),
    buildRequestBody: ({ refreshToken, clientId, clientSecret }) =>
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
  },

  "google-calendar": {
    name: "google-calendar",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    supportsRefresh: true,
    getClientCredentials: (env) => ({
      clientId: env.INTEGRATION_GOOGLE_CALENDAR_CLIENT_ID!,
      clientSecret: env.INTEGRATION_GOOGLE_CALENDAR_CLIENT_SECRET!,
    }),
    buildRequestBody: ({ refreshToken, clientId, clientSecret }) =>
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
  },

  discord: {
    name: "discord",
    tokenEndpoint: "https://discord.com/api/oauth2/token",
    supportsRefresh: true,
    getClientCredentials: (env) => ({
      clientId: env.INTEGRATION_DISCORD_CLIENT_ID!,
      clientSecret: env.INTEGRATION_DISCORD_CLIENT_SECRET!,
    }),
    buildRequestBody: ({ refreshToken, clientId, clientSecret }) =>
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
  },

  reddit: {
    name: "reddit",
    tokenEndpoint: "https://www.reddit.com/api/v1/access_token",
    supportsRefresh: true,
    getClientCredentials: (env) => ({
      clientId: env.INTEGRATION_REDDIT_CLIENT_ID!,
      clientSecret: env.INTEGRATION_REDDIT_CLIENT_SECRET!,
    }),
    buildRequestBody: ({ refreshToken }) =>
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    getAuthHeader: ({ clientId, clientSecret }) =>
      `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    additionalHeaders: {
      "User-Agent": "web:dafthunk:v1.0.0 (by /u/dafthunk)",
    },
  },

  linkedin: {
    name: "linkedin",
    tokenEndpoint: "https://www.linkedin.com/oauth/v2/accessToken",
    supportsRefresh: true,
    getClientCredentials: (env) => ({
      clientId: env.INTEGRATION_LINKEDIN_CLIENT_ID!,
      clientSecret: env.INTEGRATION_LINKEDIN_CLIENT_SECRET!,
    }),
    buildRequestBody: ({ refreshToken, clientId, clientSecret }) =>
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
  },

  github: {
    name: "github",
    tokenEndpoint: "", // Not used
    supportsRefresh: false,
    getClientCredentials: (env) => ({
      clientId: env.INTEGRATION_GITHUB_CLIENT_ID!,
      clientSecret: env.INTEGRATION_GITHUB_CLIENT_SECRET!,
    }),
    buildRequestBody: () => new URLSearchParams(), // Not used
  },
};

/**
 * Check if a provider supports token refresh
 */
export function supportsTokenRefresh(provider: string): boolean {
  return PROVIDER_CONFIGS[provider]?.supportsRefresh ?? false;
}

/**
 * Check if a token should be refreshed proactively
 * Uses 5-minute buffer to avoid failures at the last moment
 */
export function shouldRefreshToken(
  expiresAt: Date | null | undefined,
  bufferMinutes: number = 5
): boolean {
  if (!expiresAt) return false;

  const bufferMs = bufferMinutes * 60 * 1000;
  return new Date(expiresAt).getTime() - Date.now() <= bufferMs;
}

/**
 * Refresh an OAuth token
 * Handles provider-specific logic, retry, and error handling
 */
export async function refreshOAuthToken(
  provider: string,
  refreshToken: string,
  env: Bindings
): Promise<TokenRefreshResult> {
  const config = PROVIDER_CONFIGS[provider];
  if (!config) {
    throw new TokenRefreshError(provider, "Unknown provider");
  }

  if (!config.supportsRefresh) {
    throw new TokenRefreshError(
      provider,
      "Provider does not support token refresh"
    );
  }

  // Get credentials and build request
  const { clientId, clientSecret } = config.getClientCredentials(env);
  const body = config.buildRequestBody({
    refreshToken,
    clientId,
    clientSecret,
  });

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    ...config.additionalHeaders,
  };

  if (config.getAuthHeader) {
    headers.Authorization = config.getAuthHeader({ clientId, clientSecret });
  }

  // Execute request with retry
  return await executeWithRetry(
    async () => {
      const response = await fetch(config.tokenEndpoint, {
        method: "POST",
        headers,
        body,
      });

      if (!response.ok) {
        const responseBody = await response.text();
        throw new TokenRefreshError(
          provider,
          response.statusText || "Request failed",
          response.status,
          responseBody
        );
      }

      const data = (await response.json()) as {
        access_token: string;
        expires_in: number;
        refresh_token?: string;
      };

      return {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
        refreshToken: data.refresh_token,
      };
    },
    provider,
    3
  );
}

/**
 * Execute function with exponential backoff retry
 */
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  provider: string,
  maxRetries: number
): Promise<T> {
  let lastError: TokenRefreshError | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!(error instanceof TokenRefreshError)) {
        throw error;
      }

      lastError = error;

      // Don't retry on client errors (4xx) - these won't succeed
      if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }

      // Wait before retrying (1s, 2s, 4s)
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  throw new TokenRefreshError(
    provider,
    `Failed after ${maxRetries} attempts: ${lastError?.message}`
  );
}
