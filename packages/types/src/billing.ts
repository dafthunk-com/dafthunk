/**
 * Billing-related types for Stripe integration
 */

// Subscription status from Stripe
export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "unpaid"
  | "trialing";

/**
 * Billing information for an organization
 */
export interface BillingInfo {
  plan: "trial" | "pro";
  subscriptionStatus?: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  usageThisPeriod: number;
  includedCredits: number;
  /** Maximum additional usage allowed beyond included credits. null = unlimited */
  overageLimit?: number | null;
}

/**
 * Response from GET /billing endpoint
 */
export interface GetBillingResponse {
  billing: BillingInfo;
}

/**
 * Request to create a checkout session
 */
export interface CreateCheckoutSessionRequest {
  successUrl: string;
  cancelUrl: string;
}

/**
 * Response from POST /billing/checkout
 */
export interface CreateCheckoutSessionResponse {
  checkoutUrl: string;
}

/**
 * Response from POST /billing/portal
 */
export interface CreateBillingPortalResponse {
  portalUrl: string;
}

/**
 * Request to update overage limit
 */
export interface UpdateOverageLimitRequest {
  /** New overage limit. null to remove limit (unlimited) */
  overageLimit: number | null;
}

/**
 * Response from PATCH /billing/overage-limit
 */
export interface UpdateOverageLimitResponse {
  overageLimit: number | null;
}

/**
 * Usage data for billing period
 */
export interface BillingUsage {
  periodStart: Date;
  periodEnd: Date;
  totalUsage: number;
  includedCredits: number;
  overageUsage: number;
}
