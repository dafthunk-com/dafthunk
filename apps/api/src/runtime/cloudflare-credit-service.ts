import type { CreditCheckParams, CreditService } from "@dafthunk/runtime";

import type { Bindings } from "../context";
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
      unlimitedUsage,
    } = params;

    // Skip credit limit enforcement in development mode
    if (this.isDevelopment) {
      return true;
    }

    // Organizations flagged as unlimited (e.g., internal/test accounts) bypass
    // all credit checks regardless of subscription state.
    if (unlimitedUsage) {
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

/**
 * Cheap pre-check used by non-interactive triggers (scheduled, email, queue,
 * bot webhooks) to skip executions when the organisation is already out of
 * credits — preventing noisy `exhausted` execution records from piling up
 * for every cron tick or incoming event. Uses a baseline `estimatedUsage` of
 * 1 so the runtime's precise per-workflow check remains the canonical gate.
 */
export async function isOrganizationCreditExhausted(
  env: Bindings,
  organizationId: string,
  billing: {
    computeCredits: number;
    subscriptionStatus?: string;
    overageLimit?: number | null;
    unlimitedUsage?: boolean;
  }
): Promise<boolean> {
  const creditService = new CloudflareCreditService(
    env.KV,
    env.CLOUDFLARE_ENV === "development"
  );
  const hasCredits = await creditService.hasEnoughCredits({
    organizationId,
    estimatedUsage: 1,
    computeCredits: billing.computeCredits,
    subscriptionStatus: billing.subscriptionStatus,
    overageLimit: billing.overageLimit ?? null,
    unlimitedUsage: billing.unlimitedUsage,
  });
  return !hasCredits;
}
