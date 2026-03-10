import type {
  CreateEndpointRequest,
  CreateEndpointResponse,
  DeleteEndpointResponse,
  GetEndpointResponse,
  ListEndpointsResponse,
  UpdateEndpointRequest,
  UpdateEndpointResponse,
} from "@dafthunk/types";
import useSWR from "swr";

import { useAuth } from "@/components/auth-context";

import { makeOrgRequest } from "./utils";

const API_ENDPOINT_BASE = "/endpoints";

/**
 * Hook to list all endpoints for the current organization
 */
export const useEndpoints = (): {
  endpoints: ListEndpointsResponse["endpoints"];
  endpointsError: Error | null;
  isEndpointsLoading: boolean;
  mutateEndpoints: () => Promise<any>;
} => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const swrKey = orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle
      ? async () => {
          const response = await makeOrgRequest<ListEndpointsResponse>(
            orgHandle,
            API_ENDPOINT_BASE,
            ""
          );
          return response.endpoints;
        }
      : null
  );

  return {
    endpoints: data || [],
    endpointsError: error || null,
    isEndpointsLoading: isLoading,
    mutateEndpoints: mutate,
  };
};

/**
 * Hook to get a specific endpoint by ID
 */
export const useEndpoint = (id: string | null) => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const swrKey =
    orgHandle && id ? `/${orgHandle}${API_ENDPOINT_BASE}/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle && id
      ? async () => {
          return await makeOrgRequest<GetEndpointResponse>(
            orgHandle,
            API_ENDPOINT_BASE,
            `/${id}`
          );
        }
      : null
  );

  return {
    endpoint: data,
    endpointError: error || null,
    isEndpointLoading: isLoading,
    mutateEndpoint: mutate,
  };
};

/**
 * Create a new endpoint for the current organization
 */
export const createEndpoint = async (
  request: CreateEndpointRequest,
  orgHandle: string
): Promise<CreateEndpointResponse> => {
  const response = await makeOrgRequest<CreateEndpointResponse>(
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
 * Update an endpoint by ID
 */
export const updateEndpoint = async (
  id: string,
  request: UpdateEndpointRequest,
  orgHandle: string
): Promise<UpdateEndpointResponse> => {
  return await makeOrgRequest<UpdateEndpointResponse>(
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
 * Delete an endpoint by ID
 */
export const deleteEndpoint = async (
  id: string,
  orgHandle: string
): Promise<DeleteEndpointResponse> => {
  return await makeOrgRequest<DeleteEndpointResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `/${id}`,
    {
      method: "DELETE",
    }
  );
};
