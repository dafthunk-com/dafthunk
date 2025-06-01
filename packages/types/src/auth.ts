export type OrganizationRoleType = "member" | "admin" | "owner";

export interface OrganizationInfo {
  id: string;
  name: string;
  handle: string;
  role: OrganizationRoleType;
}

export interface User {
  sub: string;
  name: string;
  email?: string;
  provider: string;
  avatarUrl?: string;
  plan: string;
  role: string;
  inWaitlist?: boolean;
  organization: OrganizationInfo;
  iat?: number;
  exp?: number;
}

export interface CustomJWTPayload {
  sub: string;
  name: string;
  email?: string;
  provider: string;
  avatarUrl?: string;
  plan: string;
  role: string;
  inWaitlist: boolean;
  organization: OrganizationInfo;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

export type AuthProvider = "github" | "google";

export interface WaitlistStatus {
  inWaitlist: boolean;
  message: string;
}

export interface AuthCheckResponse {
  ok: boolean;
}

export interface UserResponse {
  user: User;
}
