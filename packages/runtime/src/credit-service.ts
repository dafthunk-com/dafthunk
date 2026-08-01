export interface BillingContext {
  computeCredits: number;
  subscriptionStatus?: string;
  /** Maximum overage beyond included credits. null = unlimited */
  overageLimit?: number | null;
  /** Bypasses all credit checks (e.g., internal/test accounts). */
  unlimitedUsage?: boolean;
}

export interface CreditParams extends BillingContext {
  organizationId: string;
}

/**
 * Whether an organization has spent everything it is allowed to spend.
 *
 * An active subscription may run past its included credits up to its overage
 * limit, so its ceiling is `computeCredits + overageLimit`. Expressing it as a
 * ceiling rather than as clamped overage matters at `overageLimit: 0` — a limit
 * customers can set through the billing API to mean "never bill me past my
 * plan". Comparing clamped overage against zero is vacuously true, which locked
 * those accounts out of their included credits entirely.
 */
export function isUsageExhausted(
  usage: number,
  billing: BillingContext
): boolean {
  if (billing.unlimitedUsage) return false;

  if (billing.subscriptionStatus === "active") {
    if (billing.overageLimit == null) return false;
    return usage >= billing.computeCredits + billing.overageLimit;
  }

  return usage >= billing.computeCredits;
}

export interface CreditService {
  hasEnoughCredits(params: CreditParams): Promise<boolean>;
  recordUsage(organizationId: string, usage: number): Promise<void>;
  settleAvailability(params: CreditParams): Promise<void>;
}
