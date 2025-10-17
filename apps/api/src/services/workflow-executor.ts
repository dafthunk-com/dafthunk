/**
 * WorkflowExecutor Service
 *
 * Centralized service for executing workflows across different trigger sources.
 * Handles parameter processing, execution creation, and persistence.
 */

import type { Node, WorkflowExecution } from "@dafthunk/types";

import type { Bindings } from "../context";
import { ExecutionStatus } from "../db";
import { ExecutionStore } from "../runtime/execution-store";
import { createSimulatedEmailMessage } from "../utils/email";
import { createSimulatedHttpRequest } from "../utils/http";

export interface WorkflowExecutorOptions {
  workflow: {
    id: string;
    name: string;
    handle: string;
    type: string;
    nodes: Node[];
    edges: any[];
  };
  userId: string;
  organizationId: string;
  computeCredits: number;
  deploymentId?: string;
  workflowSessionId?: string;
  parameters?: WorkflowExecutorParameters;
  env: Bindings;
}

export interface WorkflowExecutorParameters {
  // For email workflows
  from?: string;
  subject?: string;
  body?: string;
  // For HTTP workflows
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  formData?: Record<string, string | File>;
  // Body can be from JSON or converted form data
  requestBody?: any;
}

export interface WorkflowExecutorResult {
  executionId: string;
  execution: WorkflowExecution;
}

export class WorkflowExecutor {
  /**
   * Execute a workflow with the given options
   */
  static async execute(
    options: WorkflowExecutorOptions
  ): Promise<WorkflowExecutorResult> {
    const {
      workflow,
      userId,
      organizationId,
      computeCredits,
      deploymentId,
      workflowSessionId,
      parameters,
      env,
    } = options;

    // Build base execution parameters
    const baseExecutionParams = {
      workflow: {
        id: workflow.id,
        name: workflow.name,
        handle: workflow.handle,
        type: workflow.type,
        nodes: workflow.nodes,
        edges: workflow.edges,
      },
      userId,
      organizationId,
      computeCredits,
      ...(deploymentId && { deploymentId }),
      ...(workflowSessionId && { workflowSessionId }),
    };

    // Build type-specific execution parameters
    let finalExecutionParams: any;

    if (workflow.type === "email_message") {
      finalExecutionParams = {
        ...baseExecutionParams,
        emailMessage: createSimulatedEmailMessage({
          from: parameters?.from,
          subject: parameters?.subject,
          body: parameters?.body,
          organizationId,
          workflowHandleOrId: workflow.handle || workflow.id,
        }),
      };
    } else if (workflow.type === "http_request") {
      finalExecutionParams = {
        ...baseExecutionParams,
        httpRequest: createSimulatedHttpRequest({
          url: parameters?.url,
          method: parameters?.method,
          headers: parameters?.headers,
          query: parameters?.query,
          body: parameters?.requestBody,
          formData: parameters?.formData,
        }),
      };
    } else {
      // For other workflow types, provide basic HTTP context without payload
      finalExecutionParams = {
        ...baseExecutionParams,
        httpRequest: createSimulatedHttpRequest({
          url: parameters?.url,
          method: parameters?.method,
          headers: parameters?.headers,
          query: parameters?.query,
        }),
      };
    }

    // Start workflow execution
    const instance = await env.EXECUTE.create({
      params: finalExecutionParams,
    });
    const executionId = instance.id;

    // Build initial nodeExecutions
    const nodeExecutions = workflow.nodes.map((node) => ({
      nodeId: node.id,
      status: "executing" as const,
    }));

    // Save initial execution record
    const executionStore = new ExecutionStore(env.DB, env.RESSOURCES);
    const initialExecution = await executionStore.save({
      id: executionId,
      workflowId: workflow.id,
      deploymentId,
      userId,
      organizationId,
      status: ExecutionStatus.EXECUTING,
      nodeExecutions,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const execution: WorkflowExecution = {
      id: initialExecution.id,
      workflowId: initialExecution.workflowId,
      status: "submitted",
      nodeExecutions: initialExecution.nodeExecutions,
    };

    console.log(
      `Started workflow execution ${executionId} for workflow ${workflow.id}`
    );

    return { executionId, execution };
  }
}
