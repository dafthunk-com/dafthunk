import {
  AddMembershipRequest,
  AddMembershipResponse,
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  DeleteOrganizationResponse,
  ListMembershipsResponse,
  ListOrganizationsResponse,
  RemoveMembershipResponse,
  UpdateMembershipRequest,
  UpdateMembershipResponse,
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

// Membership Management Services

interface UseMemberships {
  memberships: Array<{
    userId: string;
    organizationId: string;
    role: "member" | "admin" | "owner";
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: string;
      name: string;
      email?: string;
      avatarUrl?: string;
    };
  }>;
  membershipsError: Error | null;
  isMembershipsLoading: boolean;
  mutateMemberships: () => Promise<any>;
}

/**
 * Hook to list all memberships for an organization
 */
export const useMemberships = (
  organizationIdOrHandle: string
): UseMemberships => {
  const swrKey = `${API_ENDPOINT_BASE}/${organizationIdOrHandle}/memberships`;

  // Debug: Log the constructed URL
  console.log(
    "useMemberships - organizationIdOrHandle:",
    organizationIdOrHandle
  );
  console.log("useMemberships - swrKey:", swrKey);

  const { data, error, isLoading, mutate } = useSWR(swrKey, async () => {
    const response = await makeRequest<ListMembershipsResponse>(swrKey);
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
 * Add a user to an organization or update their role
 */
export const addMembership = async (
  organizationIdOrHandle: string,
  request: Omit<AddMembershipRequest, "organizationId">
): Promise<AddMembershipResponse> => {
  const response = await makeRequest<AddMembershipResponse>(
    `${API_ENDPOINT_BASE}/${organizationIdOrHandle}/memberships`,
    {
      method: "POST",
      body: JSON.stringify(request),
    }
  );

  return response;
};

/**
 * Update a user's role in an organization
 */
export const updateMembership = async (
  organizationIdOrHandle: string,
  userId: string,
  request: Pick<UpdateMembershipRequest, "role">
): Promise<UpdateMembershipResponse> => {
  const response = await makeRequest<UpdateMembershipResponse>(
    `${API_ENDPOINT_BASE}/${organizationIdOrHandle}/memberships/${userId}`,
    {
      method: "PUT",
      body: JSON.stringify(request),
    }
  );

  return response;
};

/**
 * Remove a user from an organization
 */
export const removeMembership = async (
  organizationIdOrHandle: string,
  userId: string
): Promise<boolean> => {
  const response = await makeRequest<RemoveMembershipResponse>(
    `${API_ENDPOINT_BASE}/${organizationIdOrHandle}/memberships/${userId}`,
    {
      method: "DELETE",
    }
  );

  return response.success;
};
