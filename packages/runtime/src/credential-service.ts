import type { IntegrationInfo } from "./node-types";

/**
 * Credential service abstraction for accessing organization secrets and integrations.
 */
export interface CredentialService {
  initialize(organizationId: string): Promise<void>;
  getSecret(secretName: string): Promise<string | undefined>;
  getIntegration(integrationId: string): Promise<IntegrationInfo>;
}
