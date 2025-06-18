export type OrganizationRoleType = "member" | "admin" | "owner";

export interface OrganizationInfo {
  id: string;
  name: string;
  handle: string;
  role: OrganizationRoleType;
}

// Full user data as stored in database (includes provider info)
export interface DatabaseUser {
  sub: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  plan: string;
  role: string;
  inWaitlist: boolean;
  developerMode: boolean;
  organization: OrganizationInfo;
  provider: AuthProvider;
}

// User data stored in JWT tokens (includes provider for frontend logic)
export interface AuthUser {
  sub: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  plan: string;
  role: string;
  inWaitlist: boolean;
  developerMode: boolean;
  organization: OrganizationInfo;
  provider: AuthProvider;
}

// JWT payload structure (AuthUser + standard JWT fields)
export interface JWTTokenPayload extends AuthUser {
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
  user: DatabaseUser;
}
