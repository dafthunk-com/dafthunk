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
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle
  const swrKey = orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle
      ? async () => {
          const response = await makeOrgRequest<ListQueuesResponse>(
            orgHandle,
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
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle and queue ID
  const swrKey =
    orgHandle && id ? `/${orgHandle}${API_ENDPOINT_BASE}/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle && id
      ? async () => {
          return await makeOrgRequest<GetQueueResponse>(
            orgHandle,
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
  orgHandle: string
): Promise<CreateQueueResponse> => {
  const response = await makeOrgRequest<CreateQueueResponse>(
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
 * Update a queue by ID
 */
export const updateQueue = async (
  id: string,
  request: UpdateQueueRequest,
  orgHandle: string
): Promise<UpdateQueueResponse> => {
  return await makeOrgRequest<UpdateQueueResponse>(
    orgHandle,
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
  orgHandle: string
): Promise<DeleteQueueResponse> => {
  return await makeOrgRequest<DeleteQueueResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "DELETE",
    }
  );
};
