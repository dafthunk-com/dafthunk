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
  role: "member" | "admin" | "owner";
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
  role: "member" | "admin" | "owner";
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
