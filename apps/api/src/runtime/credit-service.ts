import type { CreditCheckParams, CreditService } from "@dafthunk/runtime";

import {
  getOrganizationComputeUsage,
  updateOrganizationComputeUsage,
} from "../utils/credits";

export type { CreditCheckParams, CreditService };

/**
 * KV-backed implementation of CreditService.
 * Uses Cloudflare KV for storing organization usage counters.
 */
export class CloudflareCreditService implements CreditService {
  constructor(
    private readonly kv: KVNamespace,
    private readonly isDevelopment: boolean = false
  ) {}

  async hasEnoughCredits(params: CreditCheckParams): Promise<boolean> {
    const {
      organizationId,
      computeCredits,
      estimatedUsage,
      subscriptionStatus,
      overageLimit,
    } = params;

    // Skip credit limit enforcement in development mode
    if (this.isDevelopment) {
      return true;
    }

    // Get current cumulative usage
    const currentUsage = await getOrganizationComputeUsage(
      this.kv,
      organizationId
    );

    // Pro users with active subscription
    if (subscriptionStatus === "active") {
      // If no overage limit is set, allow execution (unlimited overage)
      if (overageLimit == null) {
        return true;
      }
      // Block if current overage already at or exceeds limit
      const currentOverage = Math.max(0, currentUsage - computeCredits);
      return currentOverage < overageLimit;
    }

    // Trial users: check cumulative usage against one-time allowance
    return currentUsage + estimatedUsage <= computeCredits;
  }

  async recordUsage(organizationId: string, usage: number): Promise<void> {
    // Skip in development mode
    if (this.isDevelopment) {
      return;
    }

    if (usage > 0) {
      await updateOrganizationComputeUsage(this.kv, organizationId, usage);
    }
  }
}
