import type { IntegrationProvider } from "@dafthunk/types";
import type { LucideIcon } from "lucide-react";

/**
 * Frontend-specific provider configuration
 * Extends the base provider types with UI-specific metadata
 */
export interface ProviderConfig {
  id: IntegrationProvider;
  name: string;
  description: string;
  icon: LucideIcon;
  supportsOAuth: boolean;
  oauthEndpoint?: string;
  successMessage?: string;
  documentationUrl?: string;
}

/**
 * OAuth callback parameters
 */
export interface OAuthCallbackParams {
  success?: string;
  error?: string;
}

/**
 * Integration action types
 */
export type IntegrationAction = "connect" | "disconnect" | "refresh";
