import type {
  NodeExecution,
  WorkflowExecution,
  WorkflowExecutionStatus,
} from "@dafthunk/types";

import type { Bindings } from "../context";

/**
 * Result of polling for execution completion
 */
interface PollingResult {
  success: boolean;
  status: WorkflowExecutionStatus;
  nodeExecutions?: NodeExecution[];
  error?: string;
}

/**
 * Blob parameter structure (serialized from BlobParameter)
 */
interface SerializedBlobParameter {
  data: Uint8Array | Record<string, number>;
  mimeType: string;
}

/**
 * HTTP Response data extracted from the HTTP Response node
 */
interface HttpResponseData {
  statusCode: number;
  headers: Record<string, string>;
  body: Uint8Array;
}

/**
 * Result of sync HTTP execution
 */
export interface SyncHttpExecutionResult {
  success: boolean;
  statusCode?: number;
  headers?: Record<string, string>;
  body?: Uint8Array;
  error?: string;
  timeout?: boolean;
}

/**
 * Read execution data directly from R2
 */
async function readExecutionFromR2(
  executionId: string,
  organizationId: string,
  env: Bindings
): Promise<WorkflowExecution | undefined> {
  try {
    if (!env.RESSOURCES) {
      throw new Error("R2 bucket is not initialized");
    }

    const key = `executions/${executionId}/execution.json`;
    const object = await env.RESSOURCES.get(key);

    if (!object) {
      return undefined;
    }

    // Verify organizationId matches for security
    const storedOrgId = object.customMetadata?.organizationId;
    if (storedOrgId && storedOrgId !== organizationId) {
      console.error(
        `Access denied: execution ${executionId} does not belong to organization ${organizationId}`
      );
      return undefined;
    }

    const text = await object.text();
    return JSON.parse(text) as WorkflowExecution;
  } catch (error) {
    console.error(`Failed to read execution ${executionId} from R2:`, error);
    return undefined;
  }
}

/**
 * Polls for workflow execution completion with a timeout
 *
 * @param executionId - The execution ID to poll
 * @param organizationId - The organization ID for security verification
 * @param env - Cloudflare bindings
 * @param timeoutMs - Timeout in milliseconds (default 10000ms)
 * @param pollIntervalMs - Polling interval in milliseconds (default 100ms)
 * @returns Polling result with execution status
 */
async function pollForCompletion(
  executionId: string,
  organizationId: string,
  env: Bindings,
  timeoutMs: number = 10000,
  pollIntervalMs: number = 100
): Promise<PollingResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      // Read directly from R2 (immediate consistency) instead of Analytics Engine (eventual consistency)
      const execution = await readExecutionFromR2(
        executionId,
        organizationId,
        env
      );

      if (!execution) {
        // Execution not found yet, continue polling
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        continue;
      }

      const status = execution.status;

      // Check if execution is complete
      if (status === "completed") {
        return {
          success: true,
          status,
          nodeExecutions: execution.nodeExecutions,
        };
      } else if (status === "error" || status === "cancelled") {
        return {
          success: false,
          status,
          error: execution.error || `Execution ${status}`,
        };
      }

      // Still executing, continue polling
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    } catch (error) {
      console.error("Error polling for execution:", error);
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }

  // Timeout reached
  return {
    success: false,
    status: "executing",
    error: "Execution timeout",
  };
}

/**
 * Convert serialized Uint8Array (from JSON) back to native Uint8Array
 */
function toUint8Array(data: Uint8Array | Record<string, number>): Uint8Array {
  if (data instanceof Uint8Array) return data;
  // Convert serialized Uint8Array back to native
  const keys = Object.keys(data).map(Number).sort((a, b) => a - b);
  return new Uint8Array(keys.map((k) => data[k]));
}

/**
 * Check if a value is a blob parameter (native or serialized)
 */
function isBlobParameter(value: unknown): value is SerializedBlobParameter {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  if (!("data" in obj) || !("mimeType" in obj)) return false;

  // Handle native Uint8Array
  if (obj.data instanceof Uint8Array) return true;

  // Handle serialized Uint8Array (plain object with numeric keys from JSON)
  if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
    const keys = Object.keys(obj.data as object);
    return keys.length > 0 && keys.every((k) => /^\d+$/.test(k));
  }

  return false;
}

/**
 * Extracts HTTP response data from node executions
 *
 * @param nodeExecutions - Array of node executions
 * @returns HTTP response data if found, undefined otherwise
 */
function extractHttpResponse(
  nodeExecutions: NodeExecution[]
): HttpResponseData | undefined {
  // Find the HTTP Response node execution
  const responseNode = nodeExecutions.find((ne) => {
    // Check if this is an http-response node that completed successfully
    return (
      ne.status === "completed" &&
      ne.outputs &&
      "statusCode" in ne.outputs &&
      "body" in ne.outputs
    );
  });

  if (!responseNode || !responseNode.outputs) {
    return undefined;
  }

  const statusCode = responseNode.outputs.statusCode as number;
  const headers = (responseNode.outputs.headers as Record<string, string>) || {};
  const bodyOutput = responseNode.outputs.body;

  // Extract body as Uint8Array
  let body: Uint8Array;

  if (isBlobParameter(bodyOutput)) {
    body = toUint8Array(bodyOutput.data);
  } else if (typeof bodyOutput === "string") {
    // Legacy fallback for string body
    body = new TextEncoder().encode(bodyOutput);
  } else {
    // Fallback: encode as JSON
    body = new TextEncoder().encode(JSON.stringify(bodyOutput));
  }

  return {
    statusCode: typeof statusCode === "number" ? statusCode : 200,
    headers,
    body,
  };
}

/**
 * Executes a synchronous HTTP workflow and waits for the response
 *
 * @param executionId - The execution ID to poll
 * @param organizationId - The organization ID
 * @param env - Cloudflare bindings
 * @param timeoutMs - Timeout in milliseconds (default 10000ms)
 * @returns Sync HTTP execution result with status code and body
 */
export async function waitForSyncHttpResponse(
  executionId: string,
  organizationId: string,
  env: Bindings,
  timeoutMs: number = 10000
): Promise<SyncHttpExecutionResult> {
  // Poll for completion
  const pollingResult = await pollForCompletion(
    executionId,
    organizationId,
    env,
    timeoutMs
  );

  // Check if polling was successful
  if (!pollingResult.success) {
    if (pollingResult.error === "Execution timeout") {
      return {
        success: false,
        timeout: true,
        error: "Workflow execution timed out",
      };
    }
    return {
      success: false,
      error: pollingResult.error || "Execution failed",
    };
  }

  // Extract HTTP response from node executions
  if (!pollingResult.nodeExecutions) {
    return {
      success: false,
      error: "No node executions found",
    };
  }

  const httpResponse = extractHttpResponse(pollingResult.nodeExecutions);

  if (!httpResponse) {
    // No HTTP Response node found, return default success response
    const defaultBody = JSON.stringify({
      message: "Workflow completed successfully",
      executionId,
    });
    return {
      success: true,
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: new TextEncoder().encode(defaultBody),
    };
  }

  return {
    success: true,
    statusCode: httpResponse.statusCode,
    headers: httpResponse.headers,
    body: httpResponse.body,
  };
}
