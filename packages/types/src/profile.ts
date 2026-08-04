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
  tourCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request to update a user's profile
 *
 * Also the channel for onboarding milestones the server cannot observe. Both
 * `outcomeSeen` and `workflowKept` are things that happen in a browser — a
 * result being rendered, and someone deciding to keep it — and neither has a
 * server-side moment that means the same thing.
 */
export interface UpdateProfileRequest {
  developerMode?: boolean;
  tourCompleted?: boolean;
  /** The result of a generation was actually rendered to the user. */
  outcomeSeen?: boolean;
  /** They chose to keep the workflow rather than walking away from it. */
  workflowKept?: boolean;
}

/**
 * Response when getting a user's profile
 */
export type GetProfileResponse = UserProfile;

/**
 * Response when updating a user's profile
 */
export interface UpdateProfileResponse {
  success: boolean;
  outcomeSeen?: boolean;
  workflowKept?: boolean;
  developerMode?: boolean;
  tourCompleted?: boolean;
}
