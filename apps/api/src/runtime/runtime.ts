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
import { SkipHandler } from "./skip-handler";
import { CreditManager } from "./credit-manager";
import { ErrorHandler } from "./error-handler";
import { ExecutionMonitoring } from "./execution-monitoring";
import { ExecutionPersistence } from "./execution-persistence";
import { ExecutionEngine } from "./execution-engine";
import { ResourceProvider } from "./resource-provider";
import { StateTransitions } from "./transitions";
import type {
  ExecutionPlan,
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
  private skipHandler: SkipHandler;
  private persistence: ExecutionPersistence;
  private monitoring: ExecutionMonitoring;
  private executionEngine: ExecutionEngine;
  private transitions: StateTransitions;

  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.nodeRegistry = new CloudflareNodeRegistry(env, true);
    this.transitions = new StateTransitions(env.CLOUDFLARE_ENV === "development");

    // ResourceProvider needs to be created early but will get toolRegistry later
    this.resourceProvider = new ResourceProvider(env);

    // Create tool registry with resource provider's tool context factory
    const toolRegistry = new CloudflareToolRegistry(
      this.nodeRegistry,
      (nodeId: string, inputs: Record<string, any>) =>
        this.resourceProvider.createToolContext(nodeId, inputs)
    );

    // Set tool registry on resource provider
    this.resourceProvider.setToolRegistry(toolRegistry);

    // Initialize other components
    this.creditManager = new CreditManager(env, this.nodeRegistry);
    this.errorHandler = new ErrorHandler(env.CLOUDFLARE_ENV === "development");
    this.skipHandler = new SkipHandler(this.nodeRegistry);
    this.persistence = new ExecutionPersistence(env, this.errorHandler);
    this.monitoring = new ExecutionMonitoring(env);
    this.executionEngine = new ExecutionEngine(
      env,
      this.nodeRegistry,
      this.resourceProvider,
      this.skipHandler,
      this.errorHandler
    );

    // Set execution engine on skip handler to break circular dependency
    this.skipHandler.setExecutionEngine(this.executionEngine);
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

    // Initialize monitoring with session ID for this execution
    this.monitoring = new ExecutionMonitoring(this.env, workflowSessionId);

    // Initialise state and execution records.
    let executionState: ExecutionState = this.transitions.toSubmitted({
      nodeOutputs: new Map(),
      executedNodes: new Set(),
      skippedNodes: new Set(),
      nodeErrors: new Map(),
      status: "idle",
    });

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
    await this.monitoring.sendUpdate(executionRecord);

    if (
      !(await this.creditManager.hasEnoughComputeCredits(
        organizationId,
        computeCredits,
        this.creditManager.getNodesComputeCost(workflow.nodes)
      ))
    ) {
      executionState = this.transitions.toExhausted(executionState);
      executionRecord = await step.do(
        "persist exhausted execution state",
        Runtime.defaultStepConfig,
        async () =>
          this.persistence.saveExecutionState(
            userId,
            organizationId,
            workflow,
            instanceId,
            executionState,
            new Date(),
            new Date()
          )
      );

      // Send exhausted state update
      await this.monitoring.sendUpdate(executionRecord);
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
      executionRecord.status = executionState.status; // Use state from state machine

      // Send executing state update
      await this.monitoring.sendUpdate(executionRecord);

      // Execute nodes sequentially (one at a time, no inline grouping)
      for (const executionUnit of executionContext.executionPlan) {
        if (executionUnit.type === "individual") {
          const nodeIdentifier = executionUnit.nodeId;
          if (
            this.errorHandler.shouldSkipNode(executionState, nodeIdentifier)
          ) {
            continue; // Skip nodes that were already marked as failed.
          }

          executionState = await step.do(
            `run node ${nodeIdentifier}`,
            Runtime.defaultStepConfig,
            async () =>
              this.executionEngine.executeNode(
                executionContext!,
                executionState,
                nodeIdentifier,
                httpRequest,
                emailMessage
              )
          );

          // Send progress update after each node
          executionRecord = {
            ...executionRecord,
            status: executionState.status,
            nodeExecutions: this.persistence.buildNodeExecutions(
              executionContext.workflow,
              executionState
            ),
          };

          await this.monitoring.sendUpdate(executionRecord);
        }
        // Note: inline groups removed for simplicity
      }
    } catch (error) {
      // Capture unexpected failure.
      executionState = this.transitions.toError(executionState);
      executionRecord = {
        ...executionRecord,
        status: executionState.status, // Use state from state machine
        error: error instanceof Error ? error.message : String(error),
      };

      // Send error state update immediately
      await this.monitoring.sendUpdate(executionRecord);
    } finally {
      // Set endedAt timestamp when execution finishes (success or error)
      executionRecord.endedAt = new Date();

      // Always update status based on execution results (not just when status is "executing")
      // This ensures we transition from "executing" to "completed" or "error"
      if (executionContext) {
        executionState = this.errorHandler.updateStatus(executionContext, executionState);
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
            instanceId,
            executionState,
            executionRecord.startedAt,
            executionRecord.endedAt
          );
        }
      );

      // Send final update
      await this.monitoring.sendUpdate(executionRecord);
    }

    return executionRecord;
  }

  /**
   * Validates the workflow and creates a sequential execution order with inline groups.
   * Returns separated immutable context and mutable state.
   *
   * Absorbs ExecutionPlanner logic - no need for separate component.
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

    const orderedNodes = this.createTopologicalOrder(workflow);
    if (orderedNodes.length === 0 && workflow.nodes.length > 0) {
      throw new NonRetryableError(
        "Unable to derive execution order. The graph may contain a cycle."
      );
    }

    // Create execution plan with inline groups
    const executionPlan = this.createExecutionPlan(workflow, orderedNodes);

    // Immutable context
    const context: WorkflowExecutionContext = {
      workflow,
      executionPlan,
      workflowId,
      organizationId,
      executionId,
    };

    // Mutable state
    const state: ExecutionState = this.transitions.toExecuting({
      nodeOutputs: new Map(),
      executedNodes: new Set(),
      skippedNodes: new Set(),
      nodeErrors: new Map(),
      status: "idle",
    });

    return { context, state };
  }

  /**
   * Creates a simple execution plan with all nodes as individual execution units.
   * Inline grouping has been removed for simplicity.
   */
  private createExecutionPlan(
    workflow: Workflow,
    orderedNodes: string[]
  ): ExecutionPlan {
    // Simply create an individual execution unit for each node in order
    return orderedNodes.map((nodeId) => ({
      type: "individual" as const,
      nodeId,
    }));
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
}
