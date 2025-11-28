import type {
  ListWorkflowTemplatesResponse,
  WorkflowTemplate,
} from "@dafthunk/types";
import useSWR from "swr";

import { makeRequest } from "./utils";

const API_ENDPOINT = "/templates";

export interface UseTemplates {
  templates: WorkflowTemplate[];
  templatesError: Error | null;
  isTemplatesLoading: boolean;
  mutateTemplates: () => Promise<WorkflowTemplate[] | undefined>;
}

/**
 * Hook to fetch available workflow templates
 */
export const useTemplates = (): UseTemplates => {
  const { data, error, isLoading, mutate } = useSWR(API_ENDPOINT, async () => {
    const response =
      await makeRequest<ListWorkflowTemplatesResponse>(API_ENDPOINT);
    return response.templates;
  });

  return {
    templates: data || [],
    templatesError: error || null,
    isTemplatesLoading: isLoading,
    mutateTemplates: mutate,
  };
};
