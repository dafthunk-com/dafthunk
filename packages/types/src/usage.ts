/**
 * Response from the GET /usage endpoint
 */
export interface UsageResponse {
  computeCredits: number;
  computeUsage: number;
  remainingCredits: number;
  usagePercentage: number;
}
