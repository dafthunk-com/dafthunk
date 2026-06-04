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

export function isUsageExhausted(
  usage: number,
  billing: BillingContext
): boolean {
  if (billing.unlimitedUsage) return false;
  if (billing.subscriptionStatus === "active") {
    if (billing.overageLimit == null) return false;
    return Math.max(0, usage - billing.computeCredits) >= billing.overageLimit;
  }
  return usage >= billing.computeCredits;
}

export interface CreditService {
  hasEnoughCredits(params: CreditParams): Promise<boolean>;
  recordUsage(organizationId: string, usage: number): Promise<void>;
  settleAvailability(params: CreditParams): Promise<void>;
}
