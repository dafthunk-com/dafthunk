/**
 * Integration management module
 * Centralized location for all integration-related functionality
 */

// Types
export type { OAuthCallbackParams, ProviderConfig } from "./types";

// Provider registry
export {
  getAllProviders,
  getApiKeyProviders,
  getOAuthProviders,
  getProvider,
  getProviderLabel,
  PROVIDER_REGISTRY,
} from "./providers";

// Hooks
export { useIntegrationActions } from "./hooks/use-integration-actions";
export { useIntegrations } from "./hooks/use-integrations";
export { useOAuthCallback } from "./hooks/use-oauth-callback";

// Components
export { IntegrationActions } from "./components/integration-actions";
export { IntegrationDialog } from "./components/integration-dialog";
export { IntegrationList } from "./components/integration-list";
