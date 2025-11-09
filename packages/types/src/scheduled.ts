/**
 * Scheduled trigger context passed to workflows during execution
 */
export interface ScheduledTrigger {
  timestamp: number; // Actual execution time
  scheduledTime: number; // Expected execution time from schedule expression
  scheduleExpression: string; // Schedule expression e.g., "0 9 * * *"
}
