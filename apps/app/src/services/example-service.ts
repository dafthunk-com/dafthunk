import type {
  CreateWorkflowExampleRequest,
  ListWorkflowExamplesResponse,
  UpdateWorkflowExampleRequest,
  WorkflowExample,
  WorkflowExampleResponse,
} from "@dafthunk/types";
import useSWR from "swr";

import { makeOrgRequest } from "./utils";

const BASE = "/workflows";

function path(workflowId: string, suffix = ""): string {
  return `${BASE}/${workflowId}/examples${suffix}`;
}

export interface UseExamples {
  examples: WorkflowExample[];
  mutateExamples: () => Promise<WorkflowExample[] | undefined>;
}

/**
 * Saved input sets for a workflow.
 *
 * Keyed on the workflow so switching workflows in the editor refetches rather
 * than showing the previous one's examples.
 */
export const useExamples = (
  orgHandle: string,
  workflowId: string | undefined
): UseExamples => {
  const key =
    orgHandle && workflowId ? `/${orgHandle}${path(workflowId)}` : null;

  const { data, mutate } = useSWR(key, async () => {
    const response = await makeOrgRequest<ListWorkflowExamplesResponse>(
      orgHandle,
      BASE,
      `/${workflowId}/examples`
    );
    return response.examples;
  });

  return {
    examples: data || [],
    mutateExamples: mutate,
  };
};

export const createExample = async (
  orgHandle: string,
  workflowId: string,
  body: CreateWorkflowExampleRequest
): Promise<WorkflowExample> => {
  const response = await makeOrgRequest<WorkflowExampleResponse>(
    orgHandle,
    BASE,
    `/${workflowId}/examples`,
    { method: "POST", body: JSON.stringify(body) }
  );
  return response.example;
};

export const updateExample = async (
  orgHandle: string,
  workflowId: string,
  exampleId: string,
  body: UpdateWorkflowExampleRequest
): Promise<WorkflowExample> => {
  const response = await makeOrgRequest<WorkflowExampleResponse>(
    orgHandle,
    BASE,
    `/${workflowId}/examples/${exampleId}`,
    { method: "PATCH", body: JSON.stringify(body) }
  );
  return response.example;
};

export const deleteExample = async (
  orgHandle: string,
  workflowId: string,
  exampleId: string
): Promise<void> => {
  await makeOrgRequest<{ success: boolean }>(
    orgHandle,
    BASE,
    `/${workflowId}/examples/${exampleId}`,
    { method: "DELETE" }
  );
};
