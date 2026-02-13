/**
 * Mock Credential Service
 *
 * Test implementation of CredentialService that doesn't access database tables.
 * Provides empty secrets and integrations for testing workflows that don't need them.
 */

import type { CredentialService, IntegrationInfo } from "@dafthunk/runtime";

/**
 * Minimal mock that avoids database access
 */
export class MockCredentialService implements CredentialService {
  /**
   * Mock initialization - no database access
   */
  async initialize(_organizationId: string): Promise<void> {
    // No-op - tests don't need secrets or integrations
  }

  /**
   * Returns undefined for all secrets in test environment
   */
  async getSecret(_secretName: string): Promise<string | undefined> {
    return undefined;
  }

  /**
   * Throws for all integration lookups in test environment
   */
  async getIntegration(integrationId: string): Promise<IntegrationInfo> {
    throw new Error(
      `Integration '${integrationId}' not available in test environment`
    );
  }
}
