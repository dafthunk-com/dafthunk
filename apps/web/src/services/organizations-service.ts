import {
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  DeleteOrganizationResponse,
  ListOrganizationsResponse,
} from "@dafthunk/types";
import useSWR from "swr";

import { makeRequest } from "./utils";

// Base endpoint for organizations
const API_ENDPOINT_BASE = "/organizations";

interface UseOrganizations {
  organizations: Array<{
    id: string;
    name: string;
    handle: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  organizationsError: Error | null;
  isOrganizationsLoading: boolean;
  mutateOrganizations: () => Promise<any>;
}

/**
 * Hook to list all organizations for the current user
 */
export const useOrganizations = (): UseOrganizations => {
  const swrKey = API_ENDPOINT_BASE;

  const { data, error, isLoading, mutate } = useSWR(swrKey, async () => {
    const response =
      await makeRequest<ListOrganizationsResponse>(API_ENDPOINT_BASE);
    return response.organizations;
  });

  return {
    organizations: data || [],
    organizationsError: error || null,
    isOrganizationsLoading: isLoading,
    mutateOrganizations: mutate,
  };
};


/**
 * Create a new organization
 */
export const createOrganization = async (
  request: CreateOrganizationRequest
): Promise<CreateOrganizationResponse> => {
  const response = await makeRequest<CreateOrganizationResponse>(
    API_ENDPOINT_BASE,
    {
      method: "POST",
      body: JSON.stringify(request),
    }
  );

  return response;
};

/**
 * Delete an organization
 */
export const deleteOrganization = async (
  organizationIdOrHandle: string
): Promise<boolean> => {
  const response = await makeRequest<DeleteOrganizationResponse>(
    `${API_ENDPOINT_BASE}/${organizationIdOrHandle}`,
    {
      method: "DELETE",
    }
  );

  return response.success;
};

