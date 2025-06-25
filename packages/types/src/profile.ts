/**
 * Represents a user profile as stored in the database
 * Mirrors the user profile data from the database schema
 */
export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  githubId?: string;
  googleId?: string;
  avatarUrl?: string;
  organizationId: string;
  plan: string;
  role: string;
  developerMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request to update a user's profile
 * Currently only allows updating developerMode
 */
export interface UpdateProfileRequest {
  developerMode: boolean;
}

/**
 * Response when getting a user's profile
 */
export interface GetProfileResponse extends UserProfile {}

/**
 * Response when updating a user's profile
 */
export interface UpdateProfileResponse {
  success: boolean;
  developerMode: boolean;
}
