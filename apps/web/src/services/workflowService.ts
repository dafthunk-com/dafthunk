import useSWR from "swr";
import {
  WorkflowWithMetadata,
  CreateWorkflowRequest,
  CreateWorkflowResponse,
  GetWorkflowResponse,
  UpdateWorkflowRequest,
  UpdateWorkflowResponse,
  DeleteWorkflowResponse,
  ListWorkflowsResponse,
  ExecuteWorkflowResponse,
} from "@dafthunk/types";
import { useAuth } from "@/components/authContext";
import { makeOrgRequest } from "./utils";

// Base endpoint for workflows
const API_ENDPOINT_BASE = "/workflows";

interface UseWorkflows {
  workflows: WorkflowWithMetadata[];
  workflowsError: Error | null;
  isWorkflowsLoading: boolean;
  mutateWorkflows: () => Promise<any>;
}

/**
 * Hook to list all workflows for the current organization
 */
export const useWorkflows = (): UseWorkflows => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle
  const swrKey = orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle
      ? async () => {
          const response = await makeOrgRequest<ListWorkflowsResponse>(
            orgHandle,
            API_ENDPOINT_BASE,
            ""
          );
          return response.workflows;
        }
      : null
  );

  return {
    workflows: data || [],
    workflowsError: error || null,
    isWorkflowsLoading: isLoading,
    mutateWorkflows: mutate,
  };
};

/**
 * Hook to get a specific workflow by ID
 */
export const useWorkflow = (id: string | null) => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle and workflow ID
  const swrKey =
    orgHandle && id ? `/${orgHandle}${API_ENDPOINT_BASE}/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle && id
      ? async () => {
          return await makeOrgRequest<GetWorkflowResponse>(
            orgHandle,
            API_ENDPOINT_BASE,
            `/${id}`
          );
        }
      : null
  );

  return {
    workflow: data,
    workflowError: error || null,
    isWorkflowLoading: isLoading,
    mutateWorkflow: mutate,
  };
};

/**
 * Create a new workflow for the current organization
 */
export const createWorkflow = async (
  request: CreateWorkflowRequest,
  orgHandle: string
): Promise<WorkflowWithMetadata> => {
  const response = await makeOrgRequest<CreateWorkflowResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    "",
    {
      method: "POST",
      body: JSON.stringify(request),
    }
  );

  return response;
};

/**
 * Update an existing workflow
 */
export const updateWorkflow = async (
  id: string,
  request: UpdateWorkflowRequest,
  orgHandle: string
): Promise<WorkflowWithMetadata> => {
  const response = await makeOrgRequest<UpdateWorkflowResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    }
  );

  return response;
};

/**
 * Delete a workflow by ID
 */
export const deleteWorkflow = async (
  id: string,
  orgHandle: string
): Promise<DeleteWorkflowResponse> => {
  return await makeOrgRequest<DeleteWorkflowResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "DELETE",
    }
  );
};

/**
 * Execute a workflow by ID
 */
export const executeWorkflow = async (
  id: string,
  orgHandle: string,
  monitorProgress: boolean = false
): Promise<ExecuteWorkflowResponse> => {
  return await makeOrgRequest<ExecuteWorkflowResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${id}/execute${monitorProgress ? "?monitorProgress=true" : ""}`,
    {
      method: "POST",
    }
  );
};

/**
 * Deploy a workflow
 */
export const deployWorkflow = async (
  id: string,
  orgHandle: string
): Promise<void> => {
  await makeOrgRequest<void>(orgHandle, "/deployments", "", {
    method: "POST",
    body: JSON.stringify({ workflowId: id }),
  });
};
