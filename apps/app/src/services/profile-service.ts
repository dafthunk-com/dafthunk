import {
  GetProfileResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  UserProfile,
} from "@dafthunk/types";
import useSWR from "swr";

import { makeRequest } from "./utils";

// Base endpoint for profile
const API_ENDPOINT_BASE = "/profile";

interface UseProfile {
  profile: UserProfile | undefined;
  profileError: Error | null;
  isProfileLoading: boolean;
  mutateProfile: () => Promise<any>;
}

/**
 * Hook to get the current user's profile
 */
export const useProfile = (): UseProfile => {
  const { data, error, isLoading, mutate } = useSWR(
    API_ENDPOINT_BASE,
    async () => {
      const response = await makeRequest<GetProfileResponse>(API_ENDPOINT_BASE);
      return response;
    }
  );

  return {
    profile: data,
    profileError: error || null,
    isProfileLoading: isLoading,
    mutateProfile: mutate,
  };
};

/**
 * Update the current user's profile
 */
export const updateProfile = async (
  data: UpdateProfileRequest
): Promise<UpdateProfileResponse> => {
  const response = await makeRequest<UpdateProfileResponse>(API_ENDPOINT_BASE, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

  return response;
};

/**
 * Mark the product tour as completed
 */
export const markTourCompleted = async (): Promise<UpdateProfileResponse> => {
  return updateProfile({ tourCompleted: true });
};

/**
 * Mark that a generated result was actually rendered to the user.
 *
 * The server cannot observe this. `workflow_executed_ok` is stamped when a run
 * finishes, which happens whether or not anyone is still looking — this is the
 * event that time-to-first-outcome is measured against.
 */
export const markOutcomeSeen = async (): Promise<UpdateProfileResponse> => {
  return updateProfile({ outcomeSeen: true });
};

/** Mark that the user chose to keep what was built for them. */
export const markWorkflowKept = async (): Promise<UpdateProfileResponse> => {
  return updateProfile({ workflowKept: true });
};
