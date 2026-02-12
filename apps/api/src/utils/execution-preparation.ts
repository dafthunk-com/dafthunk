import type { BlobParameter } from "@dafthunk/runtime";
import type { Edge, Node, WorkflowTrigger } from "@dafthunk/types";
import type { Context } from "hono";
import {
  isParseError,
  type ParseRequestError,
  parseRequestBody,
} from "../utils/request-parser";
import { validateWorkflowForExecution } from "../utils/workflows";

/**
 * Workflow data structure for execution
 */
interface WorkflowData {
  trigger: WorkflowTrigger;
  nodes: Node[];
  edges: Edge[];
}

/**
 * Attachment data for email simulation
 */
interface EmailAttachment {
  filename: string;
  mimeType: string;
  data: string; // base64 encoded
}

/**
 * Parameters for email_message workflow type
 */
interface EmailMessageParameters {
  from?: string;
  subject?: string;
  emailBody?: string;
  attachments?: EmailAttachment[];
}

/**
 * Parameters for http_webhook and http_request workflow types
 */
interface HttpRequestParameters {
  url: string;
  method: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: BlobParameter;
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

  // Parse request body as raw BlobParameter
  const parsedRequest = await parseRequestBody(c);
  if (isParseError(parsedRequest)) {
    return {
      error: parsedRequest,
      status: 400,
    };
  }

  const { body } = parsedRequest;

  // Build parameters based on workflow trigger
  const parameters = buildParameters(workflowData.trigger, {
    url,
    method,
    headers,
    query,
    body,
  });

  return { parameters };
}

/**
 * Builds execution parameters based on workflow trigger
 */
function buildParameters(
  workflowTrigger: WorkflowTrigger,
  data: {
    url: string;
    method: string;
    headers: Record<string, string>;
    query: Record<string, string>;
    body?: BlobParameter;
  }
): ExecutionParameters {
  if (workflowTrigger === "email_message") {
    // For email workflows, try to parse JSON body for email parameters
    let parsedEmail:
      | {
          from?: string;
          subject?: string;
          body?: string;
          attachments?: EmailAttachment[];
        }
      | undefined;
    if (data.body && data.body.mimeType.includes("application/json")) {
      try {
        const text = new TextDecoder().decode(data.body.data);
        parsedEmail = JSON.parse(text);
      } catch {
        // Ignore parse errors, parsedEmail stays undefined
      }
    }
    return {
      from: parsedEmail?.from,
      subject: parsedEmail?.subject,
      emailBody: parsedEmail?.body,
      attachments: parsedEmail?.attachments,
    };
  } else if (
    workflowTrigger === "http_webhook" ||
    workflowTrigger === "http_request"
  ) {
    return {
      url: data.url,
      method: data.method,
      headers: data.headers,
      query: data.query,
      body: data.body,
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
