import type {
  CreateEvaluationRequest,
  CreateEvaluationResponse,
  Evaluation,
  GetEvaluationResponse,
  ListEvaluationsResponse,
} from "@dafthunk/types";
import useSWR, { type SWRConfiguration } from "swr";

import { useAuth } from "@/components/auth-context";

import { makeOrgRequest } from "./utils";

// Base endpoint for evaluations
const API_ENDPOINT_BASE = "/evaluations";

// Hook return types
type UseEvaluations = {
  evaluations: Evaluation[];
  evaluationsError: Error | null;
  isEvaluationsLoading: boolean;
  mutateEvaluations: () => Promise<unknown>;
};

type UseEvaluation = {
  evaluation: GetEvaluationResponse | null;
  evaluationError: Error | null;
  isEvaluationLoading: boolean;
  mutateEvaluation: () => Promise<unknown>;
};

/**
 * Hook to list all evaluations for the current organization
 */
export const useEvaluations = (): UseEvaluations => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle
  const swrKey = orgHandle ? `/${orgHandle}${API_ENDPOINT_BASE}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle
      ? async () => {
          const response = await makeOrgRequest<ListEvaluationsResponse>(
            orgHandle,
            API_ENDPOINT_BASE,
            ""
          );
          return response.evaluations;
        }
      : null
  );

  return {
    evaluations: data || [],
    evaluationsError: error || null,
    isEvaluationsLoading: isLoading,
    mutateEvaluations: mutate,
  };
};

/**
 * Hook to get a specific evaluation by ID
 */
export const useEvaluation = (
  evaluationId: string,
  options?: SWRConfiguration<GetEvaluationResponse>
): UseEvaluation => {
  const { organization } = useAuth();
  const orgHandle = organization?.handle;

  // Create a unique SWR key that includes the organization handle and evaluation ID
  const swrKey =
    orgHandle && evaluationId
      ? `/${orgHandle}${API_ENDPOINT_BASE}/${evaluationId}`
      : null;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    swrKey && orgHandle
      ? async () => {
          return await makeOrgRequest<GetEvaluationResponse>(
            orgHandle,
            API_ENDPOINT_BASE,
            `/${evaluationId}`
          );
        }
      : null,
    options
  );

  return {
    evaluation: data || null,
    evaluationError: error || null,
    isEvaluationLoading: isLoading,
    mutateEvaluation: mutate,
  };
};

/**
 * Create a new evaluation
 * @param data - Evaluation creation request data
 * @param orgHandle - Organization handle
 * @returns Promise with the evaluation details
 */
export const createEvaluation = async (
  data: CreateEvaluationRequest,
  orgHandle: string
): Promise<CreateEvaluationResponse> => {
  if (!orgHandle) {
    throw new Error("Organization handle is required");
  }

  return await makeOrgRequest<CreateEvaluationResponse>(
    orgHandle,
    API_ENDPOINT_BASE,
    "",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
};
