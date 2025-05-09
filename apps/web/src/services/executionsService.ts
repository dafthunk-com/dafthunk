import { apiRequest } from "@/utils/api";
import type { Execution } from "@/pages/executions";
import type { WorkflowExecution } from "@dafthunk/types";

interface ApiExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  deploymentId?: string;
  status: "executing" | "completed" | "error" | "cancelled"; // API specific status
  startedAt: string; // ISO date string
  endedAt?: string; // ISO date string
}

interface ApiExecutionsResponse {
  executions: ApiExecution[];
}

// Helper to transform API execution to frontend Execution type
const transformExecution = (apiExec: ApiExecution): Execution => {
  const startedAt = apiExec.startedAt
    ? new Date(apiExec.startedAt)
    : new Date(); // Fallback for startedAt
  const endedAt = apiExec.endedAt ? new Date(apiExec.endedAt) : undefined;

  let status: Execution["status"];
  switch (apiExec.status) {
    case "executing":
      status = "running";
      break;
    case "error":
      status = "failed";
      break;
    default:
      status = apiExec.status;
  }

  return {
    id: apiExec.id,
    workflowId: apiExec.workflowId,
    workflowName: apiExec.workflowName,
    deploymentId: apiExec.deploymentId || undefined, // Ensure undefined if not present
    status,
    startedAt,
    endedAt,
    duration:
      startedAt && endedAt
        ? `${Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)}s`
        : undefined,
  };
};

export const executionsService = {
  async getAll(params: {
    offset: number;
    limit: number;
  }): Promise<Execution[]> {
    const { offset, limit } = params;
    const url = `/executions?offset=${offset}&limit=${limit}`;
    const data = await apiRequest<ApiExecutionsResponse>(url, {
      method: "GET",
      errorMessage: "Failed to fetch executions list",
    });
    return (data.executions || []).map(transformExecution);
  },

  async getById(executionId: string): Promise<WorkflowExecution> {
    // The ExecutionDetailPage directly casts the JSON response to WorkflowExecution,
    // so we assume the API returns this structure directly for this endpoint.
    return await apiRequest<WorkflowExecution>(`/executions/${executionId}`, {
      method: "GET",
      errorMessage: `Failed to fetch execution details for ID: ${executionId}`,
    });
  },
};
