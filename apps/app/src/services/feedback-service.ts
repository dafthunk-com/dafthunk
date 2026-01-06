import type {
  CreateExecutionFeedbackRequest,
  CreateExecutionFeedbackResponse,
  ExecutionFeedback,
  ListExecutionFeedbackResponse,
  UpdateExecutionFeedbackRequest,
} from "@dafthunk/types";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

import { useAuth } from "@/components/auth-context";

import { makeOrgRequest } from "./utils";

// Base endpoint for feedback
const API_ENDPOINT_BASE = "/feedback";

//-----------------------------------------------------------------------
// Hook Return Types
//-----------------------------------------------------------------------

interface UseFeedback {
  feedback: ExecutionFeedback | null;
  feedbackError: Error | null;
  isFeedbackLoading: boolean;
  mutateFeedback: () => Promise<any>;
}

interface UseCreateFeedback {
  createFeedback: (
    data: CreateExecutionFeedbackRequest
  ) => Promise<CreateExecutionFeedbackResponse>;
  isCreating: boolean;
  createError: Error | null;
}

interface UseUpdateFeedback {
  updateFeedback: (
    feedbackId: string,
    data: UpdateExecutionFeedbackRequest
  ) => Promise<ExecutionFeedback>;
  isUpdating: boolean;
  updateError: Error | null;
}

interface UseDeleteFeedback {
  deleteFeedback: (feedbackId: string) => Promise<void>;
  isDeleting: boolean;
  deleteError: Error | null;
}

interface UseListFeedback {
  feedbackList: ExecutionFeedback[];
  feedbackListError: Error | null;
  isFeedbackListLoading: boolean;
  mutateFeedbackList: () => Promise<any>;
}

//-----------------------------------------------------------------------
// Hooks
//-----------------------------------------------------------------------

/**
 * Hook to get feedback for a specific execution
 */
export const useFeedback = (executionId: string | null): UseFeedback => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const swrKey =
    orgHandle && executionId
      ? `/${orgHandle}${API_ENDPOINT_BASE}/execution/${executionId}`
      : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey
      ? async () => {
          const response = await makeOrgRequest<ExecutionFeedback>(
            orgHandle!,
            API_ENDPOINT_BASE,
            `/execution/${executionId}`
          );
          return response;
        }
      : null,
    {
      // Don't show error toast for 404s (no feedback exists yet)
      shouldRetryOnError: false,
      revalidateOnFocus: false,
    }
  );

  return {
    feedback: data || null,
    feedbackError: error || null,
    isFeedbackLoading: isLoading,
    mutateFeedback: mutate,
  };
};

/**
 * Hook to create feedback for an execution
 */
export const useCreateFeedback = (): UseCreateFeedback => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const { trigger, isMutating, error } = useSWRMutation(
    orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}` : null,
    async (
      _key: string,
      { arg }: { arg: CreateExecutionFeedbackRequest }
    ): Promise<CreateExecutionFeedbackResponse> => {
      if (!orgHandle) throw new Error("Organization not found");

      const response = await makeOrgRequest<CreateExecutionFeedbackResponse>(
        orgHandle,
        API_ENDPOINT_BASE,
        "",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(arg),
        }
      );

      return response;
    }
  );

  return {
    createFeedback: trigger,
    isCreating: isMutating,
    createError: error || null,
  };
};

/**
 * Hook to update existing feedback
 */
export const useUpdateFeedback = (): UseUpdateFeedback => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const { trigger, isMutating, error } = useSWRMutation(
    orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}` : null,
    async (
      _key: string,
      {
        arg,
      }: { arg: { feedbackId: string; data: UpdateExecutionFeedbackRequest } }
    ): Promise<ExecutionFeedback> => {
      if (!orgHandle) throw new Error("Organization not found");

      const response = await makeOrgRequest<ExecutionFeedback>(
        orgHandle,
        API_ENDPOINT_BASE,
        `/${arg.feedbackId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(arg.data),
        }
      );

      return response;
    }
  );

  return {
    updateFeedback: (
      feedbackId: string,
      data: UpdateExecutionFeedbackRequest
    ) => trigger({ feedbackId, data }),
    isUpdating: isMutating,
    updateError: error || null,
  };
};

/**
 * Hook to delete feedback
 */
export const useDeleteFeedback = (): UseDeleteFeedback => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const { trigger, isMutating, error } = useSWRMutation(
    orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}` : null,
    async (_key: string, { arg }: { arg: string }): Promise<void> => {
      if (!orgHandle) throw new Error("Organization not found");

      await makeOrgRequest<{ success: boolean }>(
        orgHandle,
        API_ENDPOINT_BASE,
        `/${arg}`,
        {
          method: "DELETE",
        }
      );
    }
  );

  return {
    deleteFeedback: trigger,
    isDeleting: isMutating,
    deleteError: error || null,
  };
};

/**
 * Hook to list all feedback for the organization
 */
export const useListFeedback = (): UseListFeedback => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const swrKey = orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey
      ? async () => {
          const response = await makeOrgRequest<ListExecutionFeedbackResponse>(
            orgHandle!,
            API_ENDPOINT_BASE,
            ""
          );
          return response.feedback;
        }
      : null
  );

  return {
    feedbackList: data || [],
    feedbackListError: error || null,
    isFeedbackListLoading: isLoading,
    mutateFeedbackList: mutate,
  };
};
