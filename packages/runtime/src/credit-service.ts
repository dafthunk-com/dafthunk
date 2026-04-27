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
  /** When true, all credit checks are bypassed (e.g., internal/test accounts). */
  unlimitedUsage?: boolean;
}

/**
 * Credit service abstraction for compute credit checks and usage tracking.
 */
export interface CreditService {
  hasEnoughCredits(params: CreditCheckParams): Promise<boolean>;
  recordUsage(organizationId: string, usage: number): Promise<void>;
}
