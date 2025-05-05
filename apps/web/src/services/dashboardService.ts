import { API_BASE_URL } from "../config/api";

export type DashboardStats = {
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
};

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

async function apiRequest<T>(
  endpoint: string,
  method: HttpMethod = "GET",
  body?: object
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    ...(body && { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  return response.json();
}

export const dashboardService = {
  async fetchDashboard(): Promise<DashboardStats> {
    return apiRequest<DashboardStats>("/dashboard");
  },
}; 