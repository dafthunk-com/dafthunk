/**
 * ExecutionManager
 *
 * Manages workflow execution lifecycle, parameter processing, and status updates.
 * Handles interaction with Cloudflare Workflows and execution persistence.
 */

import type { BlobParameter } from "@dafthunk/runtime";
import type { WorkflowExecution, WorkflowState } from "@dafthunk/types";
import type { Bindings } from "../context";
import { createDatabase } from "../db/index";
import {
  getOrganization,
  getOrganizationBillingInfo,
  resolveOrganizationPlan,
} from "../db/queries";
import {
  WorkflowExecutor,
  type WorkflowExecutorParameters,
} from "../services/workflow-executor";
import { validateWorkflowForExecution } from "../utils/workflows";

interface ExecutionManagerOptions {
  env: Bindings;
}

export class ExecutionManager {
  private readonly env: Bindings;

  constructor(options: ExecutionManagerOptions) {
    this.env = options.env;
  }

  /**
   * Start a workflow execution
   */
  async executeWorkflow(
    state: WorkflowState,
    organizationId: string,
    userId: string,
    parameters?: Record<string, unknown>
  ): Promise<{
    executionId: string;
    execution: WorkflowExecution;
  }> {
    const db = createDatabase(this.env.DB);

    // Get organization info (for URL construction) and billing info in parallel
    const [organization, billingInfo] = await Promise.all([
      getOrganization(db, organizationId),
      getOrganizationBillingInfo(db, organizationId),
    ]);

    if (!organization || !billingInfo) {
      throw new Error("Organization not found");
    }
    const { computeCredits, subscriptionStatus, overageLimit } = billingInfo;

    validateWorkflowForExecution(state);

    const executorParameters = this.buildExecutorParameters(
      state.trigger,
      parameters,
      organizationId,
      state.id
    );

    console.log(
      `[WebSocketTrigger] Workflow ${state.id} runtime="${state.runtime ?? "workflow (default)"}" trigger="${state.trigger}"`
    );

    return await WorkflowExecutor.execute({
      workflow: {
        id: state.id,
        name: state.name,
        trigger: state.trigger,
        runtime: state.runtime,
        nodes: state.nodes,
        edges: state.edges,
      },
      userId,
      organizationId,
      computeCredits,
      subscriptionStatus: subscriptionStatus ?? undefined,
      overageLimit: overageLimit ?? null,
      parameters: executorParameters,
      userPlan: resolveOrganizationPlan(billingInfo, this.env.CLOUDFLARE_ENV),
      env: this.env,
    });
  }

  /**
   * Build executor parameters based on workflow trigger
   */
  private buildExecutorParameters(
    workflowTrigger: string,
    parameters: Record<string, unknown> | undefined,
    orgId: string,
    workflowId: string
  ): WorkflowExecutorParameters {
    switch (workflowTrigger) {
      case "email_message":
        return this.buildEmailParameters(parameters || {});
      case "http_webhook":
      case "http_request":
        return this.buildHttpParameters(parameters || {}, orgId, workflowId);
      default:
        return {};
    }
  }

  /**
   * Extract email-specific parameters
   */
  private buildEmailParameters(
    parameters: Record<string, unknown>
  ): WorkflowExecutorParameters {
    const { from, subject, body, attachments } = parameters as {
      from?: string;
      subject?: string;
      body?: string;
      attachments?: Array<{
        filename: string;
        mimeType: string;
        data: string;
      }>;
    };
    return { from, subject, emailBody: body, attachments };
  }

  /**
   * Extract HTTP-specific parameters (for http_webhook and http_request)
   * Aligns with the HTTP endpoint's execution-preparation.ts
   */
  private buildHttpParameters(
    parameters: Record<string, unknown>,
    orgId: string,
    workflowId: string
  ): WorkflowExecutorParameters {
    // Build query string from query params if provided
    const queryParams =
      (parameters.queryParams as Record<string, string>) || {};
    const queryString =
      Object.keys(queryParams).length > 0
        ? `?${new URLSearchParams(queryParams).toString()}`
        : "";

    // Construct a simulated URL that matches production format
    const basePath = `/${orgId}/workflows/${workflowId}/execute/dev`;
    const simulatedUrl = `https://api.dafthunk.com${basePath}${queryString}`;

    const result: WorkflowExecutorParameters = {
      url: simulatedUrl,
      method: (parameters.method as string) || "GET",
      headers: (parameters.headers as Record<string, string>) || {},
      query: queryParams,
    };

    // Handle base64-encoded body (from WebSocket file upload)
    if (
      parameters.bodyEncoding === "base64" &&
      typeof parameters.body === "string"
    ) {
      const binaryString = atob(parameters.body);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      result.body = {
        data: bytes,
        mimeType:
          (parameters.contentType as string) || "application/octet-stream",
      };
      return result;
    }

    // Handle body - check if it's already a BlobParameter
    if (parameters.body && typeof parameters.body === "object") {
      const maybeBlob = parameters.body as {
        data?: Uint8Array;
        mimeType?: string;
      };
      if (maybeBlob.data instanceof Uint8Array && maybeBlob.mimeType) {
        result.body = maybeBlob as BlobParameter;
        return result;
      }
    }

    // Convert body to BlobParameter based on content type or type
    if (parameters.body !== undefined && parameters.body !== null) {
      const contentType =
        (parameters.contentType as string) || "application/octet-stream";

      if (typeof parameters.body === "string") {
        result.body = {
          data: new TextEncoder().encode(parameters.body),
          mimeType: contentType,
        };
      } else if (parameters.body instanceof Uint8Array) {
        result.body = {
          data: parameters.body,
          mimeType: contentType,
        };
      } else if (typeof parameters.body === "object") {
        // Object body - serialize as JSON
        result.body = {
          data: new TextEncoder().encode(JSON.stringify(parameters.body)),
          mimeType: "application/json",
        };
      }
    }

    return result;
  }
}
