import {
  Workflow,
  WorkflowExecution,
} from "@dafthunk/types";
import {
  WorkflowEntrypoint,
  WorkflowEvent,
  WorkflowStep,
  WorkflowStepConfig,
} from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";

import { Bindings } from "../context";
import { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import { CloudflareToolRegistry } from "../nodes/cloudflare-tool-registry";
import { HttpRequest } from "../nodes/types";
import { EmailMessage } from "../nodes/types";
import { updateOrganizationComputeUsage } from "../utils/credits";
import { validateWorkflow } from "../utils/workflows";
import { CreditManager } from "./credit-manager";
import { ErrorHandler } from "./error-handler";
import { ExecutionMonitoring } from "./execution-monitoring";
import { ExecutionPersistence } from "./execution-persistence";
import { ExecutionEngine } from "./execution-engine";
import { ResourceProvider } from "./resource-provider";
import { getExecutionStatus } from "./status-utils";
import type {
  ExecutionState,
  WorkflowExecutionContext,
} from "./types";

export interface RuntimeParams {
  readonly workflow: Workflow;
  readonly userId: string;
  readonly organizationId: string;
  readonly computeCredits: number;
  readonly workflowSessionId?: string;
  readonly deploymentId?: string;
  readonly httpRequest?: HttpRequest;
  readonly emailMessage?: EmailMessage;
}

/**
 * Executes a `Workflow` instance from start to finish.
 */
export class Runtime extends WorkflowEntrypoint<Bindings, RuntimeParams> {
  /**
   * Default step configuration used across the workflow.
   */
  private static readonly defaultStepConfig: WorkflowStepConfig = {
    retries: {
      limit: 0,
      delay: 10_000,
      backoff: "exponential",
    },
    timeout: "10 minutes",
  };

  private nodeRegistry: CloudflareNodeRegistry;
  private resourceProvider: ResourceProvider;
  private creditManager: CreditManager;
  private errorHandler: ErrorHandler;
  private persistence: ExecutionPersistence;
  private executionEngine: ExecutionEngine;
  private isDevelopment: boolean;

  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.isDevelopment = env.CLOUDFLARE_ENV === "development";
    this.nodeRegistry = new CloudflareNodeRegistry(env, true);

    // Create tool registry with a factory function for tool contexts
    // We'll pass this to ResourceProvider constructor
    let resourceProvider: ResourceProvider;
    const toolRegistry = new CloudflareToolRegistry(
      this.nodeRegistry,
      (nodeId: string, inputs: Record<string, any>) =>
        resourceProvider.createToolContext(nodeId, inputs)
    );

    // Create ResourceProvider with toolRegistry
    this.resourceProvider = resourceProvider = new ResourceProvider(env, toolRegistry);

    // Initialize other components
    this.creditManager = new CreditManager(env, this.nodeRegistry);
    this.errorHandler = new ErrorHandler(env.CLOUDFLARE_ENV === "development");
    this.persistence = new ExecutionPersistence(env, this.errorHandler);
    this.executionEngine = new ExecutionEngine(
      env,
      this.nodeRegistry,
      this.resourceProvider,
      this.errorHandler
    );
  }

  /**
   * The main entrypoint called by the Workflows engine.
   *
   * Error handling strategy:
   * - Workflow-level errors (validation, cycles) → throw NonRetryableError
   * - Node execution failures → stored in nodeErrors, workflow continues
   * - Exceptions during node execution → caught, workflow status set to "error"
   * - All errors transmitted to client via sendExecutionUpdateToSession callbacks
   */
  async run(event: WorkflowEvent<RuntimeParams>, step: WorkflowStep) {
    const {
      workflow,
      userId,
      organizationId,
      workflowSessionId,
      httpRequest,
      emailMessage,
      computeCredits,
    } = event.payload;
    const instanceId = event.instanceId;

    // Use monitoring instance with session ID for this execution
    const monitoring = new ExecutionMonitoring(this.env, workflowSessionId);

    // Initialise state and execution records.
    let executionState: ExecutionState = {
      nodeOutputs: new Map(),
      executedNodes: new Set(),
      skippedNodes: new Set(),
      nodeErrors: new Map(),
    };
    this.logTransition("idle", "submitted");

    let executionRecord: WorkflowExecution = {
      id: instanceId,
      workflowId: event.payload.workflow.id,
      deploymentId: event.payload.deploymentId,
      status: "submitted",
      nodeExecutions: [],
      startedAt: undefined,
      endedAt: undefined,
    } as WorkflowExecution;

    // Send initial state update
    await monitoring.sendUpdate(executionRecord);

    if (
      !(await this.creditManager.hasEnoughComputeCredits(
        organizationId,
        computeCredits,
        this.creditManager.getNodesComputeCost(workflow.nodes)
      ))
    ) {
      // Create a minimal context for status computation (before full initialization)
      const minimalContext: WorkflowExecutionContext = {
        workflow,
        orderedNodeIds: workflow.nodes.map((n) => n.id),
        workflowId: workflow.id,
        organizationId,
        executionId: instanceId,
      };

      this.logTransition(
        getExecutionStatus(minimalContext, executionState),
        "exhausted"
      );
      executionRecord = await step.do(
        "persist exhausted execution state",
        Runtime.defaultStepConfig,
        async () =>
          this.persistence.saveExecutionState(
            userId,
            organizationId,
            workflow,
            minimalContext,
            instanceId,
            executionState,
            new Date(),
            new Date()
          )
      );

      // Send exhausted state update
      await monitoring.sendUpdate(executionRecord);
      return executionRecord;
    }

    // Declare context outside try block so it's available in finally
    let executionContext: WorkflowExecutionContext | undefined;

    try {
      // Preload all organization resources (secrets + integrations) in one step
      await step.do(
        "preload organization resources",
        Runtime.defaultStepConfig,
        async () => this.resourceProvider.initialize(organizationId)
      );

      // Prepare workflow (validation + ordering).
      // @ts-expect-error - TS2589: Type instantiation depth limitation with Cloudflare Workflows step.do
      const { context, state } = await step.do(
        "initialise workflow",
        Runtime.defaultStepConfig,
        () =>
          this.initialiseWorkflow(
            workflow,
            workflow.id,
            organizationId,
            instanceId
          )
      );

      executionContext = context;
      executionState = state;
      executionRecord.startedAt = new Date();
      executionRecord.status = getExecutionStatus(executionContext, executionState);

      // Send executing state update
      await monitoring.sendUpdate(executionRecord);

      // Execute nodes sequentially
      for (const nodeId of executionContext.orderedNodeIds) {
        if (this.errorHandler.shouldSkipNode(executionState, nodeId)) {
          continue; // Skip nodes that were already marked as failed.
        }

        executionState = await step.do(
          `run node ${nodeId}`,
          Runtime.defaultStepConfig,
          async () =>
            this.executionEngine.executeNode(
              executionContext!,
              executionState,
              nodeId,
              httpRequest,
              emailMessage
            )
        );

        // Send progress update after each node
        executionRecord = {
          ...executionRecord,
          status: getExecutionStatus(executionContext, executionState),
          nodeExecutions: this.persistence.buildNodeExecutions(
            executionContext.workflow,
            executionContext,
            executionState
          ),
        };

        await monitoring.sendUpdate(executionRecord);
      }
    } catch (error) {
      // Capture unexpected failure - log transition
      if (executionContext) {
        this.logTransition(
          getExecutionStatus(executionContext, executionState),
          "error"
        );
      }
      executionRecord = {
        ...executionRecord,
        status: executionContext
          ? getExecutionStatus(executionContext, executionState)
          : "error",
        error: error instanceof Error ? error.message : String(error),
      };

      // Send error state update immediately
      await monitoring.sendUpdate(executionRecord);
    } finally {
      // Set endedAt timestamp when execution finishes (success or error)
      executionRecord.endedAt = new Date();

      // Log final status transition
      if (executionContext) {
        this.errorHandler.logStatusTransition(executionContext, executionState);
      }

      // Always persist the final state
      executionRecord = await step.do(
        "persist final execution record",
        Runtime.defaultStepConfig,
        async () => {
          // Skip credit usage tracking in development mode
          if (this.env.CLOUDFLARE_ENV !== "development") {
            await updateOrganizationComputeUsage(
              this.env.KV,
              organizationId,
              // Update organization compute credits for executed nodes
              this.creditManager.getNodesComputeCost(
                workflow.nodes.filter((node) =>
                  executionState.executedNodes.has(node.id)
                )
              )
            );
          }
          return this.persistence.saveExecutionState(
            userId,
            organizationId,
            workflow,
            executionContext!,
            instanceId,
            executionState,
            executionRecord.startedAt,
            executionRecord.endedAt
          );
        }
      );

      // Send final update
      await monitoring.sendUpdate(executionRecord);
    }

    return executionRecord;
  }

  /**
   * Validates the workflow and creates a sequential execution order.
   * Returns separated immutable context and mutable state.
   */
  private async initialiseWorkflow(
    workflow: Workflow,
    workflowId: string,
    organizationId: string,
    executionId: string
  ): Promise<{ context: WorkflowExecutionContext; state: ExecutionState }> {
    const validationErrors = validateWorkflow(workflow);
    if (validationErrors.length > 0) {
      throw new NonRetryableError(
        `Workflow validation failed: ${validationErrors
          .map((e) => e.message)
          .join(", ")}`
      );
    }

    const orderedNodeIds = this.createTopologicalOrder(workflow);
    if (orderedNodeIds.length === 0 && workflow.nodes.length > 0) {
      throw new NonRetryableError(
        "Unable to derive execution order. The graph may contain a cycle."
      );
    }

    // Immutable context
    const context: WorkflowExecutionContext = {
      workflow,
      orderedNodeIds,
      workflowId,
      organizationId,
      executionId,
    };

    // Mutable state
    const state: ExecutionState = {
      nodeOutputs: new Map(),
      executedNodes: new Set(),
      skippedNodes: new Set(),
      nodeErrors: new Map(),
    };

    // Log transition to executing
    this.logTransition(getExecutionStatus(context, state), "executing");

    return { context, state };
  }

  /**
   * Calculates a topological ordering of nodes. Returns an empty array if a cycle is detected.
   */
  private createTopologicalOrder(workflow: Workflow): string[] {
    const inDegree: Record<string, number> = {};
    const adjacency: Record<string, string[]> = {};

    for (const node of workflow.nodes) {
      inDegree[node.id] = 0;
      adjacency[node.id] = [];
    }

    for (const edge of workflow.edges) {
      adjacency[edge.source].push(edge.target);
      inDegree[edge.target] += 1;
    }

    const queue: string[] = Object.keys(inDegree).filter(
      (id) => inDegree[id] === 0
    );
    const ordered: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      ordered.push(current);

      for (const neighbour of adjacency[current]) {
        inDegree[neighbour] -= 1;
        if (inDegree[neighbour] === 0) {
          queue.push(neighbour);
        }
      }
    }

    // If ordering missed nodes, a cycle exists.
    return ordered.length === workflow.nodes.length ? ordered : [];
  }

  /**
   * Logs state transitions in development mode for debugging.
   */
  private logTransition(
    from: "idle" | "submitted" | "executing" | "completed" | "error" | "exhausted",
    to: "submitted" | "executing" | "completed" | "error" | "exhausted"
  ): void {
    if (this.isDevelopment && from !== to) {
      console.log(`[State Transition] ${from} → ${to}`);
    }
  }
}
