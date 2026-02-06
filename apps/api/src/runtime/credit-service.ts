import {
  getOrganizationComputeUsage,
  updateOrganizationComputeUsage,
} from "../utils/credits";

/**
 * Parameters for credit availability check.
 */
export interface CreditCheckParams {
  organizationId: string;
  /** Included credits for the organization's plan */
  computeCredits: number;
  /** Estimated usage for the workflow */
  estimatedUsage: number;
  /** Subscription status (e.g., "active" for Pro users) */
  subscriptionStatus?: string;
  /** Maximum overage allowed beyond included credits. null = unlimited */
  overageLimit?: number | null;
}

/**
 * Credit service abstraction for compute credit checks and usage tracking.
 */
export interface CreditService {
  hasEnoughCredits(params: CreditCheckParams): Promise<boolean>;
  recordUsage(organizationId: string, usage: number): Promise<void>;
}

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
