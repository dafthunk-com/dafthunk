import type {
  NodeExecution,
  WorkflowExecution,
  WorkflowExecutionStatus,
} from "@dafthunk/types";

import type { Bindings } from "../context";
import {
  isBlobParameter,
  isObjectReference,
  toUint8Array,
} from "../nodes/types";
import { ObjectStore } from "../stores/object-store";

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
 * Extracts HTTP response body as Uint8Array from various formats
 */
async function extractBody(
  bodyOutput: unknown,
  headers: Record<string, string>,
  env: Bindings
): Promise<Uint8Array> {
  if (isObjectReference(bodyOutput)) {
    const objectStore = new ObjectStore(env.RESSOURCES);
    const result = await objectStore.readObject(bodyOutput);
    if (result) {
      if (!headers["content-type"]) {
        headers["content-type"] = bodyOutput.mimeType;
      }
      return result.data;
    }
    return new TextEncoder().encode("Failed to read response body");
  }

  if (isBlobParameter(bodyOutput)) {
    return toUint8Array(bodyOutput.data);
  }

  if (typeof bodyOutput === "string") {
    return new TextEncoder().encode(bodyOutput);
  }

  return new TextEncoder().encode(JSON.stringify(bodyOutput));
}

/**
 * Executes a synchronous HTTP workflow and waits for the response
 */
export async function waitForSyncHttpResponse(
  executionId: string,
  organizationId: string,
  env: Bindings,
  timeoutMs: number = 10000
): Promise<SyncHttpExecutionResult> {
  const pollingResult = await pollForCompletion(
    executionId,
    organizationId,
    env,
    timeoutMs
  );

  if (!pollingResult.success) {
    return pollingResult.error === "Execution timeout"
      ? { success: false, timeout: true, error: "Workflow execution timed out" }
      : { success: false, error: pollingResult.error || "Execution failed" };
  }

  if (!pollingResult.nodeExecutions) {
    return { success: false, error: "No node executions found" };
  }

  // Find the HTTP Response node execution
  const responseNode = pollingResult.nodeExecutions.find(
    (ne) =>
      ne.status === "completed" &&
      ne.outputs &&
      "statusCode" in ne.outputs &&
      "body" in ne.outputs
  );

  if (!responseNode?.outputs) {
    // No HTTP Response node found, return default success response
    return {
      success: true,
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: new TextEncoder().encode(
        JSON.stringify({ message: "Workflow completed successfully", executionId })
      ),
    };
  }

  const statusCode = responseNode.outputs.statusCode;
  const headers = (responseNode.outputs.headers as Record<string, string>) || {};
  const body = await extractBody(responseNode.outputs.body, headers, env);

  return {
    success: true,
    statusCode: typeof statusCode === "number" ? statusCode : 200,
    headers,
    body,
  };
}
