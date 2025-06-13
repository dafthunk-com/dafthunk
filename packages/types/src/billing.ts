/**
 * Response from the GET /billing/credits endpoint
 */
export interface BillingCreditsResponse {
  computeCredits: number;
  computeUsage: number;
}
