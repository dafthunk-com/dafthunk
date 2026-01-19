/**
 * Organization-related types for API requests and responses
 */

export interface CreateOrganizationRequest {
  name: string;
}

export interface CreateOrganizationResponse {
  organization: {
    id: string;
    name: string;
    handle: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface DeleteOrganizationResponse {
  success: boolean;
}

export interface ListOrganizationsResponse {
  organizations: Array<{
    id: string;
    name: string;
    handle: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export interface ListMembershipsRequest {
  organizationId: string;
}

export interface ListMembershipsResponse {
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
}

export interface AddMembershipRequest {
  organizationId: string;
  email: string;
  role: "member" | "admin";
}

export interface AddMembershipResponse {
  membership: {
    userId: string;
    organizationId: string;
    role: "member" | "admin" | "owner";
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface UpdateMembershipRequest {
  organizationId: string;
  email: string;
  role: "member" | "admin";
}

export interface UpdateMembershipResponse {
  membership: {
    userId: string;
    organizationId: string;
    role: "member" | "admin" | "owner";
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface RemoveMembershipRequest {
  organizationId: string;
  email: string;
}

export interface RemoveMembershipResponse {
  success: boolean;
}

/**
 * Invitation-related types
 */

export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";

export interface Invitation {
  id: string;
  email: string;
  organizationId: string;
  role: "member" | "admin";
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  inviter: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
  };
}

export interface UserInvitation {
  id: string;
  email: string;
  role: "member" | "admin";
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  organization: {
    id: string;
    name: string;
    handle: string;
  };
  inviter: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

export interface CreateInvitationRequest {
  email: string;
  role: "member" | "admin";
}

export interface CreateInvitationResponse {
  invitation: Invitation;
}

export interface ListInvitationsResponse {
  invitations: Invitation[];
}

export interface ListUserInvitationsResponse {
  invitations: UserInvitation[];
}

export interface AcceptInvitationResponse {
  membership: {
    userId: string;
    organizationId: string;
    role: "member" | "admin" | "owner";
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface DeclineInvitationResponse {
  success: boolean;
}

export interface DeleteInvitationResponse {
  success: boolean;
}

/**
 * Organization settings types
 */

export interface OrganizationSettings {
  mcpEnabled: boolean;
}

export interface GetOrganizationSettingsResponse {
  settings: OrganizationSettings;
}

export interface UpdateOrganizationSettingsRequest {
  mcpEnabled?: boolean;
}

export interface UpdateOrganizationSettingsResponse {
  settings: OrganizationSettings;
}
