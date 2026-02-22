import type {
  BatchCreateFeedbackRequest,
  BatchCreateFeedbackResponse,
  CreateFeedbackCriterionRequest,
  ExecutionFeedback,
  FeedbackCriterion,
  FeedbackSentimentType,
  ListExecutionFeedbackResponse,
  ListFeedbackCriteriaResponse,
  UpdateFeedbackCriterionRequest,
  UpsertFeedbackRequest,
} from "@dafthunk/types";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

import { useAuth } from "@/components/auth-context";
import { useInfinatePagination } from "@/hooks/use-infinate-pagination";

import { makeOrgRequest } from "./utils";

const API_ENDPOINT_BASE = "/feedback";

// ─────────────────────────────────────────────
// Criteria Hooks
// ─────────────────────────────────────────────

/**
 * List all criteria for the organization (workflow-level, deployment_id IS NULL)
 */
export const useAllCriteria = () => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const swrKey = orgHandle
    ? `/${orgHandle}${API_ENDPOINT_BASE}/criteria`
    : null;

  const { data, error, isLoading } = useSWR(
    swrKey,
    swrKey
      ? async () => {
          const response = await makeOrgRequest<ListFeedbackCriteriaResponse>(
            orgHandle!,
            API_ENDPOINT_BASE,
            "/criteria"
          );
          return response.criteria;
        }
      : null,
    { revalidateOnFocus: false }
  );

  return {
    criteria: data || [],
    criteriaError: error || null,
    isCriteriaLoading: isLoading,
  };
};

/**
 * List editable criteria for a workflow (deployment_id IS NULL)
 */
export const useWorkflowCriteria = (workflowId: string | null) => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const swrKey =
    orgHandle && workflowId
      ? `/${orgHandle}${API_ENDPOINT_BASE}/criteria/workflow/${workflowId}`
      : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey
      ? async () => {
          const response = await makeOrgRequest<ListFeedbackCriteriaResponse>(
            orgHandle!,
            API_ENDPOINT_BASE,
            `/criteria/workflow/${workflowId}`
          );
          return response.criteria;
        }
      : null,
    { revalidateOnFocus: false }
  );

  return {
    criteria: data || [],
    criteriaError: error || null,
    isCriteriaLoading: isLoading,
    mutateCriteria: mutate,
  };
};

/**
 * List frozen criteria for a deployment
 */
export const useDeploymentCriteria = (deploymentId: string | null) => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const swrKey =
    orgHandle && deploymentId
      ? `/${orgHandle}${API_ENDPOINT_BASE}/criteria/deployment/${deploymentId}`
      : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey
      ? async () => {
          const response = await makeOrgRequest<ListFeedbackCriteriaResponse>(
            orgHandle!,
            API_ENDPOINT_BASE,
            `/criteria/deployment/${deploymentId}`
          );
          return response.criteria;
        }
      : null,
    { revalidateOnFocus: false }
  );

  return {
    criteria: data || [],
    criteriaError: error || null,
    isCriteriaLoading: isLoading,
    mutateCriteria: mutate,
  };
};

/**
 * Create a feedback criterion
 */
export const useCreateCriterion = () => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const { trigger, isMutating, error } = useSWRMutation(
    orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}/criteria` : null,
    async (
      _key: string,
      { arg }: { arg: CreateFeedbackCriterionRequest }
    ): Promise<FeedbackCriterion> => {
      if (!orgHandle) throw new Error("Organization not found");
      return makeOrgRequest<FeedbackCriterion>(
        orgHandle,
        API_ENDPOINT_BASE,
        "/criteria",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(arg),
        }
      );
    }
  );

  return {
    createCriterion: trigger,
    isCreating: isMutating,
    createError: error || null,
  };
};

/**
 * Update a feedback criterion
 */
export const useUpdateCriterion = () => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const { trigger, isMutating, error } = useSWRMutation(
    orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}/criteria` : null,
    async (
      _key: string,
      {
        arg,
      }: { arg: { criterionId: string; data: UpdateFeedbackCriterionRequest } }
    ): Promise<FeedbackCriterion> => {
      if (!orgHandle) throw new Error("Organization not found");
      return makeOrgRequest<FeedbackCriterion>(
        orgHandle,
        API_ENDPOINT_BASE,
        `/criteria/${arg.criterionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(arg.data),
        }
      );
    }
  );

  return {
    updateCriterion: (
      criterionId: string,
      data: UpdateFeedbackCriterionRequest
    ) => trigger({ criterionId, data }),
    isUpdating: isMutating,
    updateError: error || null,
  };
};

/**
 * Delete a feedback criterion
 */
export const useDeleteCriterion = () => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const { trigger, isMutating, error } = useSWRMutation(
    orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}/criteria` : null,
    async (_key: string, { arg }: { arg: string }): Promise<void> => {
      if (!orgHandle) throw new Error("Organization not found");
      await makeOrgRequest<{ success: boolean }>(
        orgHandle,
        API_ENDPOINT_BASE,
        `/criteria/${arg}`,
        { method: "DELETE" }
      );
    }
  );

  return {
    deleteCriterion: trigger,
    isDeleting: isMutating,
    deleteError: error || null,
  };
};

// ─────────────────────────────────────────────
// Feedback Hooks
// ─────────────────────────────────────────────

/**
 * Get feedback for an execution (returns array of per-criterion feedback)
 */
export const useFeedback = (executionId: string | null) => {
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
          const response = await makeOrgRequest<ListExecutionFeedbackResponse>(
            orgHandle!,
            API_ENDPOINT_BASE,
            `/execution/${executionId}`
          );
          return response.feedback;
        }
      : null,
    { shouldRetryOnError: false, revalidateOnFocus: false }
  );

  return {
    feedbackList: data || [],
    feedbackError: error || null,
    isFeedbackLoading: isLoading,
    mutateFeedback: mutate,
  };
};

/**
 * Upsert feedback for a single criterion (auto-save)
 */
export const useUpsertFeedback = () => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const { trigger, isMutating, error } = useSWRMutation(
    orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}/upsert` : null,
    async (
      _key: string,
      { arg }: { arg: UpsertFeedbackRequest }
    ): Promise<ExecutionFeedback> => {
      if (!orgHandle) throw new Error("Organization not found");
      return makeOrgRequest<ExecutionFeedback>(
        orgHandle,
        API_ENDPOINT_BASE,
        "",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(arg),
        }
      );
    }
  );

  return {
    upsertFeedback: trigger,
    isUpserting: isMutating,
    upsertError: error || null,
  };
};

/**
 * Batch create feedback for all criteria in one execution
 */
export const useBatchCreateFeedback = () => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const { trigger, isMutating, error } = useSWRMutation(
    orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}/batch` : null,
    async (
      _key: string,
      { arg }: { arg: BatchCreateFeedbackRequest }
    ): Promise<BatchCreateFeedbackResponse> => {
      if (!orgHandle) throw new Error("Organization not found");
      return makeOrgRequest<BatchCreateFeedbackResponse>(
        orgHandle,
        API_ENDPOINT_BASE,
        "/batch",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(arg),
        }
      );
    }
  );

  return {
    batchCreateFeedback: trigger,
    isCreating: isMutating,
    createError: error || null,
  };
};

/**
 * Delete a single feedback entry
 */
export const useDeleteFeedback = () => {
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
        { method: "DELETE" }
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
 * List all feedback for the organization
 */
export const useListFeedback = () => {
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

const FEEDBACK_PAGE_SIZE = 20;

export interface FeedbackFilters {
  workflowId?: string;
  deploymentId?: string;
  criterionId?: string;
  sentiment?: FeedbackSentimentType;
  startDate?: string;
  endDate?: string;
}

/**
 * Paginated feedback with server-side filtering and infinite scroll
 */
export const usePaginatedFeedback = (filters: FeedbackFilters = {}) => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  const getKey = (
    pageIndex: number,
    previousPageData: ExecutionFeedback[] | null
  ) => {
    if (
      previousPageData &&
      (!previousPageData.length || previousPageData.length < FEEDBACK_PAGE_SIZE)
    ) {
      return null;
    }

    const params = new URLSearchParams();
    params.append("offset", String(pageIndex * FEEDBACK_PAGE_SIZE));
    params.append("limit", String(FEEDBACK_PAGE_SIZE));
    if (filters.workflowId) params.append("workflowId", filters.workflowId);
    if (filters.deploymentId)
      params.append("deploymentId", filters.deploymentId);
    if (filters.criterionId) params.append("criterionId", filters.criterionId);
    if (filters.sentiment) params.append("sentiment", filters.sentiment);
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);

    return orgHandle
      ? `/${orgHandle}${API_ENDPOINT_BASE}?${params.toString()}`
      : null;
  };

  const fetcher = async (url: string): Promise<ExecutionFeedback[]> => {
    if (!orgHandle) return [];

    const urlObj = new URL(url, window.location.origin);
    const path = urlObj.pathname.replace(`/${orgHandle}`, "");
    const query = urlObj.search;

    const response = await makeOrgRequest<ListExecutionFeedbackResponse>(
      orgHandle,
      path,
      query
    );
    return response.feedback;
  };

  const {
    paginatedData,
    error,
    isInitialLoading,
    isLoadingMore,
    mutate,
    isReachingEnd,
    observerTargetRef,
  } = useInfinatePagination<ExecutionFeedback>(getKey, fetcher, {
    pageSize: FEEDBACK_PAGE_SIZE,
    revalidateFirstPage: true,
    revalidateOnMount: true,
  });

  return {
    feedbackList: paginatedData,
    feedbackError: error,
    isFeedbackInitialLoading: isInitialLoading,
    isFeedbackLoadingMore: isLoadingMore,
    mutateFeedback: mutate,
    isFeedbackReachingEnd: isReachingEnd,
    feedbackObserverTargetRef: observerTargetRef,
  };
};

/**
 * Fetch all filtered feedback (no pagination) and export as CSV download
 */
export const exportFeedbackCsv = async (
  orgHandle: string,
  filters: FeedbackFilters = {}
): Promise<void> => {
  const params = new URLSearchParams();
  params.append("limit", "10000");
  if (filters.workflowId) params.append("workflowId", filters.workflowId);
  if (filters.deploymentId) params.append("deploymentId", filters.deploymentId);
  if (filters.criterionId) params.append("criterionId", filters.criterionId);
  if (filters.sentiment) params.append("sentiment", filters.sentiment);
  if (filters.startDate) params.append("startDate", filters.startDate);
  if (filters.endDate) params.append("endDate", filters.endDate);

  const response = await makeOrgRequest<ListExecutionFeedbackResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    `?${params.toString()}`
  );

  const rows = response.feedback;
  const headers = [
    "Execution ID",
    "Workflow",
    "Deployment",
    "Criterion",
    "Rating",
    "Comment",
    "Created",
  ];

  const csvRows = rows.map((f) => [
    f.executionId,
    f.workflowName ?? "",
    f.deploymentVersion != null ? `v${f.deploymentVersion}` : "",
    f.criterionQuestion ?? "",
    f.sentiment,
    f.comment ?? "",
    f.createdAt ? new Date(f.createdAt).toISOString() : "",
  ]);

  const escapeCsv = (value: string) => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csv = [
    headers.map(escapeCsv).join(","),
    ...csvRows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `feedback-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
