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

  constructor(ctx: ExecutionContext, env: Bindings) {
    super(ctx, env);
    this.nodeRegistry = new CloudflareNodeRegistry(env, true);

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
    this.errorHandler = new ErrorHandler();
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
    let executionState: ExecutionState = {
      nodeOutputs: new Map(),
      executedNodes: new Set(),
      skippedNodes: new Set(),
      nodeErrors: new Map(),
      status: "submitted",
    };

    let executionRecord: WorkflowExecution = {
      id: instanceId,
      workflowId: event.payload.workflow.id,
      deploymentId: event.payload.deploymentId,
      status: "submitted",
      nodeExecutions: [],
      startedAt: undefined,
      endedAt: undefined,
    } as WorkflowExecution;

    if (
      !(await this.creditManager.hasEnoughComputeCredits(
        organizationId,
        computeCredits,
        this.creditManager.getNodesComputeCost(workflow.nodes)
      ))
    ) {
      executionState = { ...executionState, status: "exhausted" };
      return await step.do(
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

      // Execute nodes sequentially.
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
        } else if (executionUnit.type === "inline") {
          // Execute inline group - all nodes in a single step
          const groupDescription = `inline group [${executionUnit.nodeIds.join(", ")}]`;

          executionState = await step.do(
            `run ${groupDescription}`,
            Runtime.defaultStepConfig,
            async () =>
              this.executionEngine.executeInlineGroup(
                executionContext!,
                executionState,
                executionUnit.nodeIds,
                httpRequest,
                emailMessage
              )
          );
        }

        // Send progress update
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
    } catch (error) {
      // Capture unexpected failure.
      executionState = { ...executionState, status: "error" };
      executionRecord = {
        ...executionRecord,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      // Set endedAt timestamp when execution finishes (success or error)
      executionRecord.endedAt = new Date();
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
    const state: ExecutionState = {
      nodeOutputs: new Map(),
      executedNodes: new Set(),
      skippedNodes: new Set(),
      nodeErrors: new Map(),
      status: "executing",
    };

    return { context, state };
  }

  /**
   * Creates an execution plan that groups consecutive inlinable nodes together.
   */
  private createExecutionPlan(
    workflow: Workflow,
    orderedNodes: string[]
  ): ExecutionPlan {
    const plan: ExecutionPlan = [];
    const processedNodes = new Set<string>();
    let totalInlineGroups = 0;
    let totalInlinedNodes = 0;

    for (let i = 0; i < orderedNodes.length; i++) {
      const nodeId = orderedNodes[i];

      if (processedNodes.has(nodeId)) {
        continue; // Already processed in a group
      }

      const node = workflow.nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      const nodeType = this.nodeRegistry.getNodeType(node.type);
      const isInlinable = nodeType.inlinable ?? false;

      if (isInlinable) {
        // Look ahead to find a group of connected inlinable nodes
        const inlineGroup = this.findConnectedInlinableGroup(
          workflow,
          nodeId,
          orderedNodes,
          i,
          processedNodes
        );

        if (inlineGroup.length === 1) {
          // Single node - add as individual
          plan.push({ type: "individual", nodeId: inlineGroup[0] });
        } else {
          // Multiple nodes - add as inline group
          plan.push({ type: "inline", nodeIds: [...inlineGroup] });
          totalInlineGroups++;
          totalInlinedNodes += inlineGroup.length;
        }

        // Mark all nodes in the group as processed
        inlineGroup.forEach((id) => processedNodes.add(id));
      } else {
        // Non-inlinable node - add as individual
        plan.push({ type: "individual", nodeId });
        processedNodes.add(nodeId);
      }
    }

    // Log metrics for performance analysis
    if (totalInlineGroups > 0) {
      const totalInlinableNodes = orderedNodes.filter((nodeId) => {
        const node = workflow.nodes.find((n) => n.id === nodeId);
        if (!node) return false;
        const nodeType = this.nodeRegistry.getNodeType(node.type);
        return nodeType.inlinable ?? false;
      }).length;

      const inliningEfficiency =
        (totalInlinedNodes / totalInlinableNodes) * 100;
      console.log(
        `Execution plan optimized: ${totalInlineGroups} inline groups containing ${totalInlinedNodes}/${totalInlinableNodes} inlinable nodes (${inliningEfficiency.toFixed(1)}% efficiency)`
      );

      // Log individual group sizes for analysis
      const groupSizes = plan
        .filter((unit) => unit.type === "inline")
        .map((unit) => (unit.type === "inline" ? unit.nodeIds.length : 0));

      console.log(`Group sizes: [${groupSizes.join(", ")}]`);
    }

    return plan;
  }

  /**
   * Finds a connected group of inlinable nodes starting from a given node.
   */
  private findConnectedInlinableGroup(
    workflow: Workflow,
    startNodeId: string,
    orderedNodes: string[],
    startIndex: number,
    alreadyProcessed: Set<string>
  ): string[] {
    const group = [startNodeId];
    const groupSet = new Set([startNodeId]);

    // Look ahead in the topological order for nodes that can be added to this group
    for (let i = startIndex + 1; i < orderedNodes.length; i++) {
      const candidateId = orderedNodes[i];

      // Skip if already processed or not inlinable
      if (alreadyProcessed.has(candidateId)) continue;

      const candidateNode = workflow.nodes.find((n) => n.id === candidateId);
      if (!candidateNode) continue;

      const candidateNodeType = this.nodeRegistry.getNodeType(
        candidateNode.type
      );
      if (!(candidateNodeType.inlinable ?? false)) continue;

      // Check if this candidate can be safely added to the group
      if (
        this.canSafelyAddToGroup(
          workflow,
          candidateId,
          groupSet,
          orderedNodes,
          startIndex
        )
      ) {
        group.push(candidateId);
        groupSet.add(candidateId);
      }
    }

    return group;
  }

  /**
   * Simplified check: a node can be added to a group if all its dependencies
   * are either already executed or in the current group.
   */
  private canSafelyAddToGroup(
    workflow: Workflow,
    nodeId: string,
    currentGroupSet: Set<string>,
    orderedNodes: string[],
    groupStartIndex: number
  ): boolean {
    // Get all dependencies of this node
    const dependencies = workflow.edges
      .filter((edge) => edge.target === nodeId)
      .map((edge) => edge.source);

    // Check each dependency
    for (const depId of dependencies) {
      const isInGroup = currentGroupSet.has(depId);
      const depIndex = orderedNodes.indexOf(depId);
      const isAlreadyExecuted = depIndex < groupStartIndex;

      if (!isInGroup && !isAlreadyExecuted) {
        return false; // Has unmet dependency
      }
    }

    return true;
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
