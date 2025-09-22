import {
  AddOrUpdateMembershipRequest,
  AddOrUpdateMembershipResponse,
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  DeleteMembershipRequest,
  DeleteMembershipResponse,
  DeleteOrganizationResponse,
  ListMembershipsResponse,
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
    computeCredits: number;
    role: "member" | "admin" | "owner";
    createdAt: Date;
    updatedAt: Date;
  }>;
  organizationsError: Error | null;
  isOrganizationsLoading: boolean;
  mutateOrganizations: () => Promise<any>;
}

interface UseMemberships {
  memberships: Array<{
    userId: string;
    organizationId: string;
    role: "member" | "admin" | "owner";
    createdAt: Date;
    updatedAt: Date;
  }>;
  membershipsError: Error | null;
  isMembershipsLoading: boolean;
  mutateMemberships: () => Promise<any>;
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
 * Hook to list all memberships for a specific organization
 */
export const useMemberships = (
  organizationIdOrHandle: string
): UseMemberships => {
  const swrKey = `${API_ENDPOINT_BASE}/${organizationIdOrHandle}/memberships`;

  const { data, error, isLoading, mutate } = useSWR(swrKey, async () => {
    const response = await makeRequest<ListMembershipsResponse>(
      `${API_ENDPOINT_BASE}/${organizationIdOrHandle}/memberships`
    );
    return response.memberships;
  });

  return {
    memberships: data || [],
    membershipsError: error || null,
    isMembershipsLoading: isLoading,
    mutateMemberships: mutate,
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

/**
 * Add or update a user's membership in an organization
 */
export const addOrUpdateMembership = async (
  organizationIdOrHandle: string,
  request: AddOrUpdateMembershipRequest
): Promise<AddOrUpdateMembershipResponse> => {
  const response = await makeRequest<AddOrUpdateMembershipResponse>(
    `${API_ENDPOINT_BASE}/${organizationIdOrHandle}/memberships`,
    {
      method: "POST",
      body: JSON.stringify(request),
    }
  );

  return response;
};

/**
 * Delete a user's membership from an organization
 */
export const deleteMembership = async (
  organizationIdOrHandle: string,
  request: DeleteMembershipRequest
): Promise<boolean> => {
  const response = await makeRequest<DeleteMembershipResponse>(
    `${API_ENDPOINT_BASE}/${organizationIdOrHandle}/memberships`,
    {
      method: "DELETE",
      body: JSON.stringify(request),
    }
  );

  return response.success;
};
