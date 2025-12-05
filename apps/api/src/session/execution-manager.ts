/**
 * ExecutionManager
 *
 * Manages workflow execution lifecycle, parameter processing, and status updates.
 * Handles interaction with Cloudflare Workflows and execution persistence.
 */

import type {
  WorkflowExecution,
  WorkflowExecutionUpdateMessage,
  WorkflowState,
} from "@dafthunk/types";

import type { Bindings } from "../context";
import { createDatabase } from "../db/index";
import { getOrganizationComputeCredits } from "../db/queries";
import type { BlobParameter } from "../nodes/types";
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

    const computeCredits = await getOrganizationComputeCredits(
      db,
      organizationId
    );
    if (computeCredits === undefined) {
      throw new Error("Organization not found");
    }

    validateWorkflowForExecution(state);

    const executorParameters = this.buildExecutorParameters(
      state.type,
      parameters
    );

    return await WorkflowExecutor.execute({
      workflow: {
        id: state.id,
        name: state.name,
        handle: state.handle,
        type: state.type,
        nodes: state.nodes,
        edges: state.edges,
      },
      userId,
      organizationId,
      computeCredits,
      workflowSessionId: state.id,
      parameters: executorParameters,
      env: this.env,
    });
  }

  /**
   * Build executor parameters based on workflow type
   */
  private buildExecutorParameters(
    workflowType: string,
    parameters?: Record<string, unknown>
  ): WorkflowExecutorParameters {
    if (!parameters) {
      return {};
    }

    switch (workflowType) {
      case "email_message":
        return this.buildEmailParameters(parameters);
      case "http_webhook":
      case "http_request":
        return this.buildHttpParameters(parameters);
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
    const { from, subject, body } = parameters as {
      from?: string;
      subject?: string;
      body?: string;
    };
    return { from, subject, emailBody: body };
  }

  /**
   * Extract HTTP-specific parameters (for http_webhook and http_request)
   * Converts parameters to raw BlobParameter body
   */
  private buildHttpParameters(
    parameters: Record<string, unknown>
  ): WorkflowExecutorParameters {
    // If parameters contain a body that's already a BlobParameter, use it directly
    if (parameters.body && typeof parameters.body === "object") {
      const maybeBlob = parameters.body as { data?: Uint8Array; mimeType?: string };
      if (maybeBlob.data instanceof Uint8Array && maybeBlob.mimeType) {
        return { body: maybeBlob as BlobParameter };
      }
    }

    // Convert parameters to JSON body
    if (Object.keys(parameters).length > 0) {
      const jsonStr = JSON.stringify(parameters);
      const body: BlobParameter = {
        data: new TextEncoder().encode(jsonStr),
        mimeType: "application/json",
      };
      return { body };
    }

    return {};
  }

  /**
   * Create execution update message
   */
  createExecutionUpdateMessage(
    execution: WorkflowExecution
  ): WorkflowExecutionUpdateMessage {
    return {
      type: "execution_update",
      executionId: execution.id,
      status: execution.status,
      nodeExecutions: execution.nodeExecutions,
      error: execution.error,
    };
  }
}
