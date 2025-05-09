import { apiRequest } from "@/utils/api";
import type { WorkflowExecution } from "@dafthunk/types";
import { mutate } from "swr";

interface ApiExecutionsResponse {
  executions: WorkflowExecution[];
}
export const executionsService = {
  async getAll(params: {
    offset: number;
    limit: number;
  }): Promise<WorkflowExecution[]> {
    const { offset, limit } = params;
    const url = `/executions?offset=${offset}&limit=${limit}`;
    const data = await apiRequest<ApiExecutionsResponse>(url, {
      method: "GET",
      errorMessage: "Failed to fetch executions list",
    });
    return data.executions;
  },

  async getById(executionId: string): Promise<WorkflowExecution> {
    // The ExecutionDetailPage directly casts the JSON response to WorkflowExecution,
    // so we assume the API returns this structure directly for this endpoint.
    return await apiRequest<WorkflowExecution>(`/executions/${executionId}`, {
      method: "GET",
      errorMessage: `Failed to fetch execution details for ID: ${executionId}`,
    });
  },

  async setExecutionPublic(executionId: string): Promise<void> {
    await apiRequest(`/executions/${executionId}/share/public`, {
      method: "PATCH",
      errorMessage: `Failed to set execution ${executionId} to public`,
    });
    await mutate(
      (key) => typeof key === "string" && key.startsWith("/executions"),
      undefined,
      { revalidate: true }
    );
  },

  async setExecutionPrivate(executionId: string): Promise<void> {
    await apiRequest(`/executions/${executionId}/share/private`, {
      method: "PATCH",
      errorMessage: `Failed to set execution ${executionId} to private`,
    });
    await mutate(
      (key) => typeof key === "string" && key.startsWith("/executions"),
      undefined,
      { revalidate: true }
    );
  },
};
