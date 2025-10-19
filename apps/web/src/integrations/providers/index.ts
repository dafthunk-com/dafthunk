import type { IntegrationProvider } from "@dafthunk/types";

import type { ProviderConfig } from "../types";
import { anthropicProvider } from "./anthropic";
import { discordProvider } from "./discord";
import { geminiProvider } from "./gemini";
import { githubProvider } from "./github";
import { googleCalendarProvider } from "./google-calendar";
import { googleMailProvider } from "./google-mail";
import { linkedinProvider } from "./linkedin";
import { openaiProvider } from "./openai";
import { redditProvider } from "./reddit";

/**
 * Registry of all integration providers
 * Centralized configuration for all supported integrations
 */
export const PROVIDER_REGISTRY: Record<IntegrationProvider, ProviderConfig> = {
  "google-mail": googleMailProvider,
  "google-calendar": googleCalendarProvider,
  discord: discordProvider,
  reddit: redditProvider,
  linkedin: linkedinProvider,
  github: githubProvider,
  openai: openaiProvider,
  anthropic: anthropicProvider,
  gemini: geminiProvider,
};

/**
 * Get provider configuration by ID
 */
export function getProvider(
  providerId: IntegrationProvider
): ProviderConfig | undefined {
  return PROVIDER_REGISTRY[providerId];
}

/**
 * Get all providers as an array
 */
export function getAllProviders(): ProviderConfig[] {
  return Object.values(PROVIDER_REGISTRY);
}

/**
 * Get OAuth providers only
 */
export function getOAuthProviders(): ProviderConfig[] {
  return getAllProviders().filter((p) => p.supportsOAuth);
}

/**
 * Get API key providers only
 */
export function getApiKeyProviders(): ProviderConfig[] {
  return getAllProviders().filter((p) => !p.supportsOAuth);
}

/**
 * Get provider label by ID
 */
export function getProviderLabel(providerId: IntegrationProvider): string {
  return PROVIDER_REGISTRY[providerId]?.name || providerId;
}
