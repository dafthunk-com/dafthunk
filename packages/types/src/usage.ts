/**
 * Response from the GET /usage/credits endpoint
 */
export interface UsageCreditsResponse {
  computeCredits: number;
  computeUsage: number;
  remainingCredits: number;
  usagePercentage: number;
}
