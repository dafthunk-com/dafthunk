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
