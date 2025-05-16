/**
 * Represents the statistics for the dashboard view
 */
export interface DashboardStats {
  workflows: number;
  deployments: number;
  executions: {
    total: number;
    running: number;
    failed: number;
    avgTimeSeconds: number;
  };
  recentExecutions: Array<{
    id: string;
    workflowName: string;
    status: string;
    startedAt: number;
  }>;
}

/**
 * Response for dashboard statistics
 */
export interface DashboardStatsResponse {
  stats: DashboardStats;
}
