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
 * Get only available providers based on backend configuration
 */
export function getAvailableProviders(
  availableProviderIds: IntegrationProvider[]
): ProviderConfig[] {
  return availableProviderIds
    .map((id) => PROVIDER_REGISTRY[id])
    .filter((p): p is ProviderConfig => p !== undefined);
}

/**
 * Get provider label by ID
 */
export function getProviderLabel(providerId: IntegrationProvider): string {
  return PROVIDER_REGISTRY[providerId]?.name || providerId;
}
