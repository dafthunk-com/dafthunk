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
import { createDatabase, ExecutionStatus, saveExecution } from "../db/index";
import { getOrganizationComputeCredits } from "../db/queries";
import { ObjectStore } from "../runtime/object-store";
import { createSimulatedEmailMessage } from "../utils/email";
import {
  createSimulatedHttpRequest,
  processHttpParameters,
} from "../utils/http";

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
    if (!state.nodes || state.nodes.length === 0) {
      throw new Error(
        "Cannot execute an empty workflow. Please add nodes to the workflow."
      );
    }

    // Construct emailMessage or httpRequest from parameters based on workflow type
    let emailMessage;
    let httpRequest;

    if (state.type === "email_message") {
      // For email workflows, extract email parameters
      if (parameters && typeof parameters === "object") {
        const { from, subject, body } = parameters as {
          from?: string;
          subject?: string;
          body?: string;
        };

        emailMessage = createSimulatedEmailMessage({
          from,
          subject,
          body,
          organizationId,
          workflowHandleOrId: state.handle || state.id,
        });
      }
    } else if (state.type === "http_request") {
      // For HTTP workflows, process parameters to extract body and formData
      const { body: requestBody, formData: requestFormData } =
        processHttpParameters(parameters as Record<string, any>);

      // Create HTTP request with simulated metadata and parameters as body/formData
      httpRequest = createSimulatedHttpRequest({
        // Simulated HTTP metadata (defaults from createSimulatedHttpRequest)
        url: undefined,
        method: undefined,
        headers: undefined,
        query: undefined,
        // Parameters become the body and formData
        body: requestBody,
        formData: requestFormData,
      });
    } else {
      // For other workflow types, provide basic HTTP context without body
      httpRequest = createSimulatedHttpRequest({});
    }

    const executionParams = {
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
      ...(emailMessage && { emailMessage }),
      ...(httpRequest && { httpRequest }),
    };

    // Start workflow execution
    const instance = await this.env.EXECUTE.create({
      params: executionParams,
    });
    const executionId = instance.id;

    // Build initial nodeExecutions
    const nodeExecutions = state.nodes.map((node) => ({
      nodeId: node.id,
      status: "executing" as const,
    }));

    // Save initial execution record (metadata to DB)
    const initialExecution = await saveExecution(db, {
      id: executionId,
      workflowId: state.id,
      userId,
      organizationId,
      status: ExecutionStatus.EXECUTING,
      nodeExecutions,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Save execution data to R2
    const objectStore = new ObjectStore(this.env.RESSOURCES);
    try {
      await objectStore.writeExecution(initialExecution);
    } catch (error) {
      console.error(`Failed to save execution to R2: ${executionId}`, error);
    }

    const execution: WorkflowExecution = {
      id: initialExecution.id,
      workflowId: initialExecution.workflowId,
      status: "submitted",
      nodeExecutions: initialExecution.nodeExecutions,
    };

    console.log(
      `Started workflow execution ${executionId} for workflow ${state.id}`
    );

    return { executionId, execution };
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
