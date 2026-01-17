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
 * Service for managing compute credit checks and usage tracking.
 *
 * Abstracts credit-related logic from the workflow runtime, enabling:
 * - Easier testing with mock implementations
 * - Separation of billing concerns from execution logic
 * - Potential for different credit strategies (KV, database, etc.)
 */
export interface CreditService {
  /**
   * Checks if organization has enough credits to execute a workflow.
   *
   * Credit logic:
   * - Pro users (active subscription): Allowed unless overage limit is set and exceeded
   * - Trial users: Limited to computeCredits (blocks when cumulative usage exceeds allowance)
   */
  hasEnoughCredits(params: CreditCheckParams): Promise<boolean>;

  /**
   * Records compute usage after workflow execution completes.
   * Called once per execution with the total actual usage.
   */
  recordUsage(organizationId: string, usage: number): Promise<void>;
}

/**
 * KV-backed credit service implementation.
 * Uses Cloudflare KV for storing organization usage counters.
 */
export class KVCreditService implements CreditService {
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
