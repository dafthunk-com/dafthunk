/**
 * Configures AI provider SDK clients to route through Cloudflare AI Gateway
 * with stored API keys.
 *
 * The gateway authenticates via cf-aig-authorization and injects stored provider
 * API keys automatically. Each SDK's own auth header (Authorization for OpenAI,
 * x-api-key for Anthropic) is nullified so the placeholder "gateway-managed"
 * value isn't forwarded to the provider.
 *
 * @see https://developers.cloudflare.com/ai-gateway/get-started/
 * @see https://developers.cloudflare.com/ai-gateway/configuration/authentication/
 */

interface GatewayEnv {
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_AI_GATEWAY_ID?: string;
}

function getGateway(env: GatewayEnv, provider: string) {
  const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, CLOUDFLARE_AI_GATEWAY_ID } = env;
  if (!CLOUDFLARE_AI_GATEWAY_ID || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    return undefined;
  }
  return {
    baseURL: `https://gateway.ai.cloudflare.com/v1/${CLOUDFLARE_ACCOUNT_ID}/${CLOUDFLARE_AI_GATEWAY_ID}/${provider}`,
    gatewayHeader: { "cf-aig-authorization": `Bearer ${CLOUDFLARE_API_TOKEN}` },
  };
}

/** OpenAI SDK constructor options. Nullifies Authorization to prevent forwarding the placeholder apiKey. */
export function getOpenAIConfig(env: GatewayEnv): {
  baseURL?: string;
  defaultHeaders?: Record<string, string | null>;
} {
  const gw = getGateway(env, "openai");
  if (!gw) return {};
  return {
    baseURL: gw.baseURL,
    defaultHeaders: { ...gw.gatewayHeader, Authorization: null },
  };
}

/** Anthropic SDK constructor options. Nullifies x-api-key to prevent forwarding the placeholder apiKey. */
export function getAnthropicConfig(env: GatewayEnv): {
  baseURL?: string;
  defaultHeaders?: Record<string, string | null>;
} {
  const gw = getGateway(env, "anthropic");
  if (!gw) return {};
  return {
    baseURL: gw.baseURL,
    defaultHeaders: { ...gw.gatewayHeader, "x-api-key": null },
  };
}

/** Google GenAI SDK constructor options (uses httpOptions with lowercase baseUrl). */
export function getGoogleAIConfig(env: GatewayEnv): {
  httpOptions?: { baseUrl: string; headers: Record<string, string> };
} {
  const gw = getGateway(env, "google-ai-studio");
  if (!gw) return {};
  return { httpOptions: { baseUrl: gw.baseURL, headers: gw.gatewayHeader } };
}
