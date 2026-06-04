/**
 * Billing context shared by every credit-related operation.
 */
export interface BillingContext {
  computeCredits: number;
  subscriptionStatus?: string;
  /** Maximum overage beyond included credits. null = unlimited */
  overageLimit?: number | null;
  /** Bypasses all credit checks (e.g., internal/test accounts). */
  unlimitedUsage?: boolean;
}

export interface CreditCheckParams extends BillingContext {
  organizationId: string;
  estimatedUsage: number;
}

export interface SettleAvailabilityParams extends BillingContext {
  organizationId: string;
}

/**
 * Canonical predicate for "this organization is out of credits." Pure — no
 * I/O — so the pre-execution check and the post-execution cache settlement
 * evaluate the same formula.
 */
export function isUsageExhausted(
  usage: number,
  billing: BillingContext,
  estimatedUsage: number
): boolean {
  if (billing.unlimitedUsage) return false;
  if (billing.subscriptionStatus === "active") {
    if (billing.overageLimit == null) return false;
    return Math.max(0, usage - billing.computeCredits) >= billing.overageLimit;
  }
  return usage + estimatedUsage > billing.computeCredits;
}

export interface CreditService {
  hasEnoughCredits(params: CreditCheckParams): Promise<boolean>;
  recordUsage(organizationId: string, usage: number): Promise<void>;
  settleAvailability(params: SettleAvailabilityParams): Promise<void>;
}
