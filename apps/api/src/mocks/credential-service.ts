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
  private organizationId: string | null = null;

  /**
   * Mock initialization - no database access
   */
  async initialize(organizationId: string): Promise<void> {
    this.organizationId = organizationId;
  }

  getOrganizationId(): string {
    if (!this.organizationId) {
      throw new Error("Credential service not initialized");
    }
    return this.organizationId;
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
