import type { ParameterValue } from "./workflow";

/**
 * Request body for playground node execution
 */
export interface ExecuteNodeRequest {
  nodeType: string;
  inputs: Record<string, ParameterValue>;
}

/**
 * Response from playground node execution
 */
export interface ExecuteNodeResponse {
  status: "completed" | "error";
  outputs?: Record<string, ParameterValue>;
  error?: string;
  usage: number;
}
