import { apiRequest } from "@/utils/api";
import type {
  WorkflowDeployment,
  WorkflowDeploymentVersion,
} from "@dafthunk/types";

interface WorkflowInfo {
  id: string;
  name: string;
}

export interface DeploymentHistoryData {
  workflow: WorkflowInfo;
  deployments: WorkflowDeploymentVersion[];
}

export const deploymentService = {
  async getAll(): Promise<WorkflowDeployment[]> {
    return await apiRequest<{ workflows: WorkflowDeployment[] }>(
      "/deployments",
      {
        method: "GET",
        errorMessage: "Failed to get all deployments",
      }
    ).then((data) => data.workflows);
  },

  async getHistory(workflowId: string): Promise<DeploymentHistoryData> {
    return await apiRequest<DeploymentHistoryData>(
      `/deployments/history/${workflowId}`,
      {
        method: "GET",
        errorMessage: "Failed to get deployment history",
      }
    );
  },

  async getVersion(deploymentId: string): Promise<WorkflowDeploymentVersion> {
    return await apiRequest<WorkflowDeploymentVersion>(
      `/deployments/version/${deploymentId}`,
      {
        method: "GET",
        errorMessage: "Failed to get deployment version",
      }
    );
  },
};
