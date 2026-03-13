import {
  CreateQueueRequest,
  CreateQueueResponse,
  DeleteQueueResponse,
  GetQueueResponse,
  ListQueuesResponse,
  UpdateQueueRequest,
  UpdateQueueResponse,
} from "@dafthunk/types";
import useSWR from "swr";

import { useAuth } from "@/components/auth-context";

import { makeOrgRequest } from "./utils";

// Base endpoint for queues
const API_ENDPOINT_BASE = "/queues";

/**
 * Hook to list all queues for the current organization
 */
export const useQueues = (): {
  queues: ListQueuesResponse["queues"];
  queuesError: Error | null;
  isQueuesLoading: boolean;
  mutateQueues: () => Promise<any>;
} => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  // Create a unique SWR key that includes the organization ID
  const swrKey = orgId ? `/${orgId}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId
      ? async () => {
          const response = await makeOrgRequest<ListQueuesResponse>(
            orgId,
            API_ENDPOINT_BASE,
            ""
          );
          return response.queues;
        }
      : null
  );

  return {
    queues: data || [],
    queuesError: error || null,
    isQueuesLoading: isLoading,
    mutateQueues: mutate,
  };
};

/**
 * Hook to get a specific queue by ID
 */
export const useQueue = (id: string | null) => {
  const { organization } = useAuth();
  const orgId = organization?.id;

  // Create a unique SWR key that includes the organization ID and queue ID
  const swrKey = orgId && id ? `/${orgId}${API_ENDPOINT_BASE}/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgId && id
      ? async () => {
          return await makeOrgRequest<GetQueueResponse>(
            orgId,
            API_ENDPOINT_BASE,
            `/${id}`
          );
        }
      : null
  );

  return {
    queue: data,
    queueError: error || null,
    isQueueLoading: isLoading,
    mutateQueue: mutate,
  };
};

/**
 * Create a new queue for the current organization
 */
export const createQueue = async (
  request: CreateQueueRequest,
  orgId: string
): Promise<CreateQueueResponse> => {
  const response = await makeOrgRequest<CreateQueueResponse>(
    orgId,
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
 * Update a queue by ID
 */
export const updateQueue = async (
  id: string,
  request: UpdateQueueRequest,
  orgId: string
): Promise<UpdateQueueResponse> => {
  return await makeOrgRequest<UpdateQueueResponse>(
    orgId,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    }
  );
};

/**
 * Delete a queue by ID
 */
export const deleteQueue = async (
  id: string,
  orgId: string
): Promise<DeleteQueueResponse> => {
  return await makeOrgRequest<DeleteQueueResponse>(
    orgId,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "DELETE",
    }
  );
};
