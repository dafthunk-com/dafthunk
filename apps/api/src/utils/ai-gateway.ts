/**
 * Utilities for configuring AI provider clients to use Cloudflare AI Gateway
 * with authentication.
 *
 * @see https://developers.cloudflare.com/ai-gateway/configuration/authentication/
 */

type Provider = "openai" | "anthropic" | "google-ai-studio";

interface GatewayEnv {
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_AI_GATEWAY_ID?: string;
}

interface GatewayConfig {
  baseURL: string;
  headers: Record<string, string>;
}

/**
 * Builds the AI Gateway URL for a specific provider.
 */
function buildGatewayUrl(
  accountId: string,
  gatewayId: string,
  provider: Provider
): string {
  return `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/${provider}`;
}

/**
 * Returns gateway configuration for an AI provider if gateway is configured.
 * Returns undefined if gateway is not configured (missing required env vars).
 */
export function getGatewayConfig(
  env: GatewayEnv,
  provider: Provider
): GatewayConfig | undefined {
  const {
    CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_API_TOKEN,
    CLOUDFLARE_AI_GATEWAY_ID,
  } = env;

  // All three env vars are required for gateway authentication
  if (
    !CLOUDFLARE_AI_GATEWAY_ID ||
    !CLOUDFLARE_ACCOUNT_ID ||
    !CLOUDFLARE_API_TOKEN
  ) {
    return undefined;
  }

  return {
    baseURL: buildGatewayUrl(
      CLOUDFLARE_ACCOUNT_ID,
      CLOUDFLARE_AI_GATEWAY_ID,
      provider
    ),
    headers: {
      "cf-aig-authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
    },
  };
}

/**
 * Returns OpenAI client configuration with gateway support.
 */
export function getOpenAIConfig(env: GatewayEnv): {
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
} {
  const gateway = getGatewayConfig(env, "openai");
  if (!gateway) {
    return {};
  }
  return {
    baseURL: gateway.baseURL,
    defaultHeaders: gateway.headers,
  };
}

/**
 * Returns Anthropic client configuration with gateway support.
 */
export function getAnthropicConfig(env: GatewayEnv): {
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
} {
  const gateway = getGatewayConfig(env, "anthropic");
  if (!gateway) {
    return {};
  }
  return {
    baseURL: gateway.baseURL,
    defaultHeaders: gateway.headers,
  };
}

/**
 * Returns Google AI (Gemini) client configuration with gateway support.
 * Uses httpOptions with baseUrl (lowercase) and headers as per @google/genai SDK.
 */
export function getGoogleAIConfig(env: GatewayEnv): {
  httpOptions?: { baseUrl: string; headers: Record<string, string> };
} {
  const gateway = getGatewayConfig(env, "google-ai-studio");
  if (!gateway) {
    return {};
  }
  return {
    httpOptions: {
      baseUrl: gateway.baseURL,
      headers: gateway.headers,
    },
  };
}
