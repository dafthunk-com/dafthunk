/**
 * Mock Credit Service
 *
 * In-memory implementation of CreditService for testing.
 * Always allows execution (unlimited credits) by default.
 */

import type {
  CreditCheckParams,
  CreditService,
} from "../runtime/credit-service";

export class MockCreditService implements CreditService {
  private usageByOrg: Map<string, number> = new Map();
  private allowExecution: boolean = true;

  /**
   * Configure whether credit checks should pass or fail.
   * Useful for testing credit exhaustion scenarios.
   */
  setAllowExecution(allow: boolean): void {
    this.allowExecution = allow;
  }

  async hasEnoughCredits(_params: CreditCheckParams): Promise<boolean> {
    return this.allowExecution;
  }

  async recordUsage(organizationId: string, usage: number): Promise<void> {
    const currentUsage = this.usageByOrg.get(organizationId) ?? 0;
    this.usageByOrg.set(organizationId, currentUsage + usage);
  }

  /**
   * Get recorded usage for an organization (for test verification)
   */
  getUsage(organizationId: string): number {
    return this.usageByOrg.get(organizationId) ?? 0;
  }

  /**
   * Clear all recorded usage
   */
  clear(): void {
    this.usageByOrg.clear();
    this.allowExecution = true;
  }
}
