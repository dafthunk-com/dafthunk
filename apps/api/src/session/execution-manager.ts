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
    return { from, subject, body };
  }

  /**
   * Extract HTTP-specific parameters
   */
  private buildHttpParameters(
    parameters: Record<string, unknown>
  ): WorkflowExecutorParameters {
    const { body: requestBody, formData } = processHttpParameters(parameters);
    return { requestBody, formData };
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
