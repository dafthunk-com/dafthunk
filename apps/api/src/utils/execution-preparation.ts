import type { Edge, JsonValue, Node, WorkflowType } from "@dafthunk/types";
import type { Context } from "hono";

import {
  isParseError,
  parseRequestBody,
  type ParseRequestError,
} from "../utils/request-parser";
import { validateWorkflowForExecution } from "../utils/workflows";

/**
 * Workflow data structure for execution
 */
interface WorkflowData {
  type: WorkflowType;
  nodes: Node[];
  edges: Edge[];
}

/**
 * Parameters for email_message workflow type
 */
interface EmailMessageParameters {
  from?: string;
  subject?: string;
  body?: string;
}

/**
 * Parameters for http_request workflow type
 */
interface HttpRequestParameters {
  url: string;
  method: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  formData?: Record<string, string | File>;
  requestBody?: JsonValue;
}

/**
 * Parameters for manual and scheduled workflow types
 */
interface DefaultParameters {
  url: string;
  method: string;
  headers: Record<string, string>;
  query: Record<string, string>;
}

/**
 * Discriminated union of execution parameters based on workflow type
 */
type ExecutionParameters =
  | EmailMessageParameters
  | HttpRequestParameters
  | DefaultParameters;

interface ExecutionPreparationResult {
  parameters: ExecutionParameters;
}

interface ExecutionPreparationError {
  error: string | ParseRequestError;
  status: 400;
}

/**
 * Prepares a workflow for execution by validating, extracting request info,
 * and building parameters based on workflow type.
 *
 * @param c - Hono context
 * @param workflowData - Workflow data to execute
 * @returns Execution parameters or error response
 */
export async function prepareWorkflowExecution(
  c: Context,
  workflowData: WorkflowData
): Promise<ExecutionPreparationResult | ExecutionPreparationError> {
  // Validate if workflow has nodes
  try {
    validateWorkflowForExecution(workflowData);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Invalid workflow",
      status: 400,
    };
  }

  // Extract HTTP request information
  const headers = c.req.header();
  const url = c.req.url;
  const method = c.req.method;
  const query = Object.fromEntries(new URL(c.req.url).searchParams.entries());

  // Parse request body
  const parsedRequest = await parseRequestBody(c);
  if (isParseError(parsedRequest)) {
    return {
      error: parsedRequest,
      status: 400,
    };
  }

  const { body, formData } = parsedRequest;

  // Build parameters based on workflow type
  const parameters = buildParameters(workflowData.type, {
    url,
    method,
    headers,
    query,
    body,
    formData,
  });

  return { parameters };
}

/**
 * Builds execution parameters based on workflow type
 */
function buildParameters(
  workflowType: WorkflowType,
  data: {
    url: string;
    method: string;
    headers: Record<string, string>;
    query: Record<string, string>;
    body?: JsonValue;
    formData?: Record<string, string | File>;
  }
): ExecutionParameters {
  if (workflowType === "email_message") {
    const emailBody = data.body as
      | { from?: string; subject?: string; body?: string }
      | undefined;
    return {
      from: emailBody?.from,
      subject: emailBody?.subject,
      body: emailBody?.body,
    };
  } else if (workflowType === "http_request") {
    return {
      url: data.url,
      method: data.method,
      headers: data.headers,
      query: data.query,
      formData: data.formData,
      requestBody: data.body,
    };
  } else {
    return {
      url: data.url,
      method: data.method,
      headers: data.headers,
      query: data.query,
    };
  }
}

/**
 * Type guard to check if the result is an error
 */
export function isExecutionPreparationError(
  result: ExecutionPreparationResult | ExecutionPreparationError
): result is ExecutionPreparationError {
  return "status" in result;
}
