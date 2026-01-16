/**
 * WorkflowExecutor Service
 *
 * Centralized service for executing workflows across different trigger sources.
 * Handles parameter processing, execution creation, and persistence.
 */

import type { Node, WorkflowExecution, WorkflowRuntime } from "@dafthunk/types";

import type { Bindings } from "../context";
import type { BlobParameter } from "../nodes/types";
import { WorkerRuntime } from "../runtime/worker-runtime";
import { createSimulatedEmailMessage } from "../utils/email";
import { createSimulatedHttpRequest } from "../utils/http";

export interface WorkflowExecutorOptions {
  workflow: {
    id: string;
    name: string;
    handle: string;
    trigger: string;
    runtime?: WorkflowRuntime;
    nodes: Node[];
    edges: any[];
  };
  userId: string;
  organizationId: string;
  computeCredits: number;
  subscriptionStatus?: string;
  /** Maximum additional usage allowed beyond included credits. null = unlimited */
  overageLimit?: number | null;
  deploymentId?: string;
  workflowSessionId?: string;
  parameters?: WorkflowExecutorParameters;
  userPlan?: string;
  env: Bindings;
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  data: string; // base64 encoded
}

export interface WorkflowExecutorParameters {
  // For email workflows
  from?: string;
  subject?: string;
  emailBody?: string;
  attachments?: EmailAttachment[];
  // For HTTP workflows
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: BlobParameter;
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
      subscriptionStatus,
      overageLimit,
      deploymentId,
      workflowSessionId,
      parameters,
      userPlan,
      env,
    } = options;

    // Build base execution parameters
    const baseExecutionParams = {
      workflow: {
        id: workflow.id,
        name: workflow.name,
        handle: workflow.handle,
        trigger: workflow.trigger,
        nodes: workflow.nodes,
        edges: workflow.edges,
      },
      userId,
      organizationId,
      computeCredits,
      ...(subscriptionStatus && { subscriptionStatus }),
      ...(overageLimit !== undefined && { overageLimit }),
      ...(deploymentId && { deploymentId }),
      ...(workflowSessionId && { workflowSessionId }),
      ...(userPlan && { userPlan }),
    };

    // Build type-specific execution parameters
    let finalExecutionParams: any;

    if (workflow.trigger === "email_message") {
      finalExecutionParams = {
        ...baseExecutionParams,
        emailMessage: createSimulatedEmailMessage({
          from: parameters?.from,
          subject: parameters?.subject,
          body: parameters?.emailBody,
          attachments: parameters?.attachments,
          organizationId,
          workflowHandleOrId: workflow.handle || workflow.id,
        }),
      };
    } else if (
      workflow.trigger === "http_webhook" ||
      workflow.trigger === "http_request"
    ) {
      finalExecutionParams = {
        ...baseExecutionParams,
        httpRequest: createSimulatedHttpRequest({
          url: parameters?.url,
          method: parameters?.method,
          headers: parameters?.headers,
          query: parameters?.query,
          body: parameters?.body,
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

    // Use WorkerRuntime for "worker" runtime (synchronous execution)
    // Use Cloudflare Workflows for "workflow" runtime (durable execution, default)
    if (workflow.runtime === "worker") {
      const workerRuntime = WorkerRuntime.create(env);
      const execution = await workerRuntime.execute(finalExecutionParams);

      console.log(
        `Completed worker runtime execution ${execution.id} for workflow ${workflow.id}`
      );

      return { executionId: execution.id, execution };
    }

    // Start workflow execution using Cloudflare Workflows (durable)
    const instance = await env.EXECUTE.create({
      params: finalExecutionParams,
    });
    const executionId = instance.id;

    // Build initial nodeExecutions
    const nodeExecutions = workflow.nodes.map((node) => ({
      nodeId: node.id,
      status: "executing" as const,
      usage: 0,
    }));

    // Create initial execution record
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id,
      status: "submitted",
      nodeExecutions,
    };

    console.log(
      `Started workflow execution ${executionId} for workflow ${workflow.id}`
    );

    return { executionId, execution };
  }
}
