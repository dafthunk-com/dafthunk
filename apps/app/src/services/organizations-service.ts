import type {
  AcceptInvitationResponse,
  AddMembershipRequest,
  AddMembershipResponse,
  CreateInvitationRequest,
  CreateInvitationResponse,
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  DeclineInvitationResponse,
  DeleteInvitationResponse,
  DeleteOrganizationResponse,
  GetOrganizationSettingsResponse,
  Invitation,
  ListInvitationsResponse,
  ListMembershipsResponse,
  ListOrganizationsResponse,
  ListUserInvitationsResponse,
  OrganizationSettings,
  RemoveMembershipRequest,
  RemoveMembershipResponse,
  UpdateMembershipRequest,
  UpdateMembershipResponse,
  UpdateOrganizationSettingsRequest,
  UpdateOrganizationSettingsResponse,
  UserInvitation,
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
export const useOrganizations = (enabled: boolean = true): UseOrganizations => {
  const swrKey = enabled ? API_ENDPOINT_BASE : null;

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
  request: Omit<UpdateMembershipRequest, "organizationId">
): Promise<UpdateMembershipResponse> => {
  const response = await makeRequest<UpdateMembershipResponse>(
    `${API_ENDPOINT_BASE}/${organizationIdOrHandle}/memberships`,
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
  request: Omit<RemoveMembershipRequest, "organizationId">
): Promise<boolean> => {
  const response = await makeRequest<RemoveMembershipResponse>(
    `${API_ENDPOINT_BASE}/${organizationIdOrHandle}/memberships`,
    {
      method: "DELETE",
      body: JSON.stringify(request),
    }
  );

  return response.success;
};

// Invitation Management Services

interface UseInvitations {
  invitations: Invitation[];
  invitationsError: Error | null;
  isInvitationsLoading: boolean;
  mutateInvitations: () => Promise<any>;
}

/**
 * Hook to list all pending invitations for an organization
 */
export const useInvitations = (
  organizationIdOrHandle: string
): UseInvitations => {
  const swrKey = `${API_ENDPOINT_BASE}/${organizationIdOrHandle}/invitations`;

  const { data, error, isLoading, mutate } = useSWR(swrKey, async () => {
    const response = await makeRequest<ListInvitationsResponse>(swrKey);
    return response.invitations;
  });

  return {
    invitations: data || [],
    invitationsError: error || null,
    isInvitationsLoading: isLoading,
    mutateInvitations: mutate,
  };
};

/**
 * Create an invitation to join an organization
 */
export const createInvitation = async (
  organizationIdOrHandle: string,
  request: CreateInvitationRequest
): Promise<CreateInvitationResponse> => {
  const response = await makeRequest<CreateInvitationResponse>(
    `${API_ENDPOINT_BASE}/${organizationIdOrHandle}/invitations`,
    {
      method: "POST",
      body: JSON.stringify(request),
    }
  );

  return response;
};

/**
 * Cancel/delete an invitation
 */
export const deleteInvitation = async (
  organizationIdOrHandle: string,
  invitationId: string
): Promise<boolean> => {
  const response = await makeRequest<DeleteInvitationResponse>(
    `${API_ENDPOINT_BASE}/${organizationIdOrHandle}/invitations/${invitationId}`,
    {
      method: "DELETE",
    }
  );

  return response.success;
};

// User Invitation Services (for accepting/declining invitations)

const INVITATIONS_ENDPOINT = "/invitations";

interface UseUserInvitations {
  invitations: UserInvitation[];
  invitationsError: Error | null;
  isInvitationsLoading: boolean;
  mutateInvitations: () => Promise<any>;
}

/**
 * Hook to list all pending invitations for the current user
 */
export const useUserInvitations = (): UseUserInvitations => {
  const { data, error, isLoading, mutate } = useSWR(
    INVITATIONS_ENDPOINT,
    async () => {
      const response =
        await makeRequest<ListUserInvitationsResponse>(INVITATIONS_ENDPOINT);
      return response.invitations;
    }
  );

  return {
    invitations: data || [],
    invitationsError: error || null,
    isInvitationsLoading: isLoading,
    mutateInvitations: mutate,
  };
};

/**
 * Accept an invitation
 */
export const acceptInvitation = async (
  invitationId: string
): Promise<AcceptInvitationResponse> => {
  const response = await makeRequest<AcceptInvitationResponse>(
    `${INVITATIONS_ENDPOINT}/${invitationId}/accept`,
    {
      method: "POST",
    }
  );

  return response;
};

/**
 * Decline an invitation
 */
export const declineInvitation = async (
  invitationId: string
): Promise<boolean> => {
  const response = await makeRequest<DeclineInvitationResponse>(
    `${INVITATIONS_ENDPOINT}/${invitationId}/decline`,
    {
      method: "POST",
    }
  );

  return response.success;
};

// Organization Settings Services

interface UseOrganizationSettings {
  settings: OrganizationSettings | null;
  settingsError: Error | null;
  isSettingsLoading: boolean;
  mutateSettings: () => Promise<unknown>;
}

/**
 * Hook to get organization settings
 */
export const useOrganizationSettings = (
  organizationIdOrHandle: string
): UseOrganizationSettings => {
  const swrKey = organizationIdOrHandle
    ? `${API_ENDPOINT_BASE}/${organizationIdOrHandle}/settings`
    : null;

  const { data, error, isLoading, mutate } = useSWR(swrKey, async () => {
    if (!swrKey) return null;
    const response = await makeRequest<GetOrganizationSettingsResponse>(swrKey);
    return response.settings;
  });

  return {
    settings: data || null,
    settingsError: error || null,
    isSettingsLoading: isLoading,
    mutateSettings: mutate,
  };
};

/**
 * Update organization settings
 */
export const updateOrganizationSettings = async (
  organizationIdOrHandle: string,
  request: UpdateOrganizationSettingsRequest
): Promise<UpdateOrganizationSettingsResponse> => {
  const response = await makeRequest<UpdateOrganizationSettingsResponse>(
    `${API_ENDPOINT_BASE}/${organizationIdOrHandle}/settings`,
    {
      method: "PATCH",
      body: JSON.stringify(request),
    }
  );

  return response;
};
