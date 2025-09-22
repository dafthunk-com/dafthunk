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
    computeCredits: number;
    createdAt: Date;
    updatedAt: Date;
  };
  membership: {
    userId: string;
    organizationId: string;
    role: "owner";
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
    computeCredits: number;
    role: "member" | "admin" | "owner";
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export interface AddOrUpdateMembershipRequest {
  userId: string;
  role: "member" | "admin" | "owner";
}

export interface AddOrUpdateMembershipResponse {
  membership: {
    userId: string;
    organizationId: string;
    role: "member" | "admin" | "owner";
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface DeleteMembershipRequest {
  userId: string;
}

export interface DeleteMembershipResponse {
  success: boolean;
}

export interface ListMembershipsResponse {
  memberships: Array<{
    userId: string;
    organizationId: string;
    role: "member" | "admin" | "owner";
    createdAt: Date;
    updatedAt: Date;
  }>;
}
