/**
 * ExecutionManager
 *
 * Manages workflow execution lifecycle, parameter processing, and status updates.
 * Handles interaction with Cloudflare Workflows and execution persistence.
 */

import type {
  WorkflowErrorMessage,
  WorkflowExecution,
  WorkflowExecutionUpdateMessage,
  WorkflowState,
} from "@dafthunk/types";

import type { Bindings } from "../context";
import { createDatabase } from "../db/index";
import { getOrganizationComputeCredits } from "../db/queries";
import {
  WorkflowExecutor,
  type WorkflowExecutorParameters,
} from "../services/workflow-executor";
import { processHttpParameters } from "../utils/http";
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

    // Get organization compute credits
    const computeCredits = await getOrganizationComputeCredits(
      db,
      organizationId
    );
    if (computeCredits === undefined) {
      throw new Error("Organization not found");
    }

    // Validate workflow has nodes
    validateWorkflowForExecution(state);

    // Process parameters based on workflow type
    let executorParameters: WorkflowExecutorParameters = {};

    if (state.type === "email_message" && parameters) {
      const { from, subject, body } = parameters as {
        from?: string;
        subject?: string;
        body?: string;
      };
      executorParameters = { from, subject, body };
    } else if (state.type === "http_request" && parameters) {
      const { body: requestBody, formData } = processHttpParameters(
        parameters as Record<string, any>
      );
      executorParameters = { requestBody, formData };
    }

    // Execute workflow using shared service
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

  /**
   * Create error message
   */
  createErrorMessage(
    error: string,
    details?: string
  ): WorkflowErrorMessage {
    return {
      error,
      ...(details && { details }),
    };
  }
}
