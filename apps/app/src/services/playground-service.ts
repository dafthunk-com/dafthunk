import type { ExecuteNodeResponse, ParameterValue } from "@dafthunk/types";

import { makeOrgRequest } from "./utils";

const API_ENDPOINT_BASE = "/playground";

/**
 * Execute a single node in the playground
 */
export const executeNode = async (
  nodeType: string,
  inputs: Record<string, ParameterValue>,
  orgHandle: string
): Promise<ExecuteNodeResponse> => {
  return makeOrgRequest<ExecuteNodeResponse>(orgHandle, API_ENDPOINT_BASE, "", {
    method: "POST",
    body: JSON.stringify({ nodeType, inputs }),
  });
};
