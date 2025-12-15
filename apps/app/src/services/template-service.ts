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

export interface UseTemplate {
  template: WorkflowTemplate | null;
  templateError: Error | null;
  isTemplateLoading: boolean;
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

/**
 * Hook to fetch a single workflow template by ID
 */
export const useTemplate = (templateId: string | undefined): UseTemplate => {
  const { data, error, isLoading } = useSWR(
    templateId ? `${API_ENDPOINT}/${templateId}` : null,
    async () => makeRequest<WorkflowTemplate>(`${API_ENDPOINT}/${templateId}`)
  );

  return {
    template: data || null,
    templateError: error || null,
    isTemplateLoading: isLoading,
  };
};
