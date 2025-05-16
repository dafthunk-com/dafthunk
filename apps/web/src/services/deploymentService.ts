import useSWR from "swr";
import {
  WorkflowDeployment,
  WorkflowDeploymentVersion,
  ListDeploymentsResponse,
  GetWorkflowDeploymentsResponse,
  GetDeploymentVersionResponse,
} from "@dafthunk/types";
import { useAuth } from "@/components/auth-context";
import { makeOrgRequest } from "./utils";

// Base endpoint for deployments
const API_ENDPOINT_BASE = "/deployments";

// Hook return types
type UseDeployments = {
  deployments: WorkflowDeployment[];
  deploymentsError: Error | null;
  isDeploymentsLoading: boolean;
  mutateDeployments: () => Promise<unknown>;
};

type UseDeploymentHistory = {
  workflow: { id: string; name: string } | null;
  deployments: WorkflowDeploymentVersion[];
  deploymentHistoryError: Error | null;
  isDeploymentHistoryLoading: boolean;
  mutateHistory: () => Promise<unknown>;
};

type UseDeploymentVersion = {
  deploymentVersion: WorkflowDeploymentVersion | null;
  deploymentVersionError: Error | null;
  isDeploymentVersionLoading: boolean;
  mutateDeploymentVersion: () => Promise<unknown>;
};

/**
 * Hook to list all deployments for the current organization
 */
export const useDeployments = (): UseDeployments => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle
  const swrKey = orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle
      ? async () => {
          const response = await makeOrgRequest<ListDeploymentsResponse>(
            orgHandle,
            API_ENDPOINT_BASE,
            ""
          );
          return response.workflows;
        }
      : null
  );

  return {
    deployments: data || [],
    deploymentsError: error || null,
    isDeploymentsLoading: isLoading,
    mutateDeployments: mutate,
  };
};

/**
 * Hook to get deployment history for a specific workflow
 */
export const useDeploymentHistory = (
  workflowId: string
): UseDeploymentHistory => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle and workflow ID
  const swrKey =
    orgHandle && workflowId
      ? `/${orgHandle}${API_ENDPOINT_BASE}/history/${workflowId}`
      : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle
      ? async () => {
          return await makeOrgRequest<GetWorkflowDeploymentsResponse>(
            orgHandle,
            API_ENDPOINT_BASE,
            `/history/${workflowId}`
          );
        }
      : null
  );

  return {
    workflow: data?.workflow || null,
    deployments: data?.deployments || [],
    deploymentHistoryError: error || null,
    isDeploymentHistoryLoading: isLoading,
    mutateHistory: mutate,
  };
};

/**
 * Hook to get a specific deployment version
 */
export const useDeploymentVersion = (
  deploymentId: string
): UseDeploymentVersion => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle and deployment ID
  const swrKey =
    orgHandle && deploymentId
      ? `/${orgHandle}${API_ENDPOINT_BASE}/version/${deploymentId}`
      : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle
      ? async () => {
          return await makeOrgRequest<GetDeploymentVersionResponse>(
            orgHandle,
            API_ENDPOINT_BASE,
            `/version/${deploymentId}`
          );
        }
      : null
  );

  return {
    deploymentVersion: data || null,
    deploymentVersionError: error || null,
    isDeploymentVersionLoading: isLoading,
    mutateDeploymentVersion: mutate,
  };
};

/**
 * Create a new deployment for a workflow
 * @param workflowId - ID of the workflow to deploy
 * @param orgHandle - Organization handle
 * @returns Promise with the deployment details
 */
export const createDeployment = async (
  workflowId: string,
  orgHandle: string
): Promise<WorkflowDeploymentVersion> => {
  if (!workflowId || !orgHandle) {
    throw new Error("Workflow ID and organization handle are required");
  }

  return await makeOrgRequest<WorkflowDeploymentVersion>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${workflowId}`,
    {
      method: "POST",
    }
  );
};
