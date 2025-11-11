import type {
  Node,
  QueueMessage,
  ScheduledTrigger,
  Workflow,
  WorkflowExecution,
  WorkflowExecutionStatus,
} from "@dafthunk/types";
import {
  WorkflowEntrypoint,
  WorkflowEvent,
  WorkflowStep,
  WorkflowStepConfig,
} from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";

import { Bindings } from "../context";
import { BaseNodeRegistry } from "../nodes/base-node-registry";
import { CloudflareToolRegistry } from "../nodes/cloudflare-tool-registry";
import {
  apiToNodeParameter,
  nodeToApiParameter,
} from "../nodes/parameter-mapper";
import { EmailMessage, HttpRequest } from "../nodes/types";
import {
  MonitoringService,
  WorkflowSessionMonitoringService,
} from "../services/monitoring-service";
import { ExecutionStore } from "../stores/execution-store";
import { ObjectStore } from "../stores/object-store";
import {
  getOrganizationComputeUsage,
  updateOrganizationComputeUsage,
} from "../utils/credits";
import { validateWorkflow } from "../utils/workflows";
import { ResourceProvider } from "./resource-provider";
import type {
  ExecutionState,
  NodeRuntimeValues,
  RuntimeValue,
  WorkflowExecutionContext,
} from "./types";
import {
  getExecutionStatus,
  getNodeType,
  isRuntimeValue,
  NodeNotFoundError,
  NodeTypeNotImplementedError,
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
  readonly queueMessage?: QueueMessage;
  readonly scheduledTrigger?: ScheduledTrigger;
}

/**
 * Injectable dependencies for BaseRuntime.
 * Allows overriding default implementations for testing.
 */
export interface RuntimeDependencies {
  nodeRegistry?: BaseNodeRegistry;
  resourceProvider?: ResourceProvider;
  executionStore?: ExecutionStore;
  monitoringService?: MonitoringService;
}

/**
 * Base Runtime - Abstract Workflow Execution Engine
 *
 * Base class for executing Workflow instances from start to finish.
 * Provides core execution logic with dependency injection support.
 *
 * This class should not be instantiated directly. Use:
 * - {@link CloudflareRuntime} for production deployments
 * - {@link MockRuntime} for testing
 *
 * ## Dependency Injection
 *
 * Accepts optional RuntimeDependencies to override default implementations:
 * - nodeRegistry: Registry of available node types
 * - resourceProvider: Manages external resources (AI models, secrets, integrations)
 * - executionStore: Persists workflow execution state
 * - monitoringService: Sends real-time execution updates
 */
export class BaseRuntime extends WorkflowEntrypoint<Bindings, RuntimeParams> {
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

  protected nodeRegistry: BaseNodeRegistry;
  protected resourceProvider: ResourceProvider;
  protected executionStore: ExecutionStore;
  protected monitoringService: MonitoringService;

  constructor(
    ctx: ExecutionContext,
    env: Bindings,
    dependencies?: RuntimeDependencies
  ) {
    super(ctx, env);

    // Use injected dependencies or create defaults
    // Note: We can't use CloudflareNodeRegistry here directly because importing it
    // would pull in all node types (including geotiff with node:https).
    // Instead, we require nodeRegistry to be provided when using BaseRuntime.
    if (!dependencies?.nodeRegistry) {
      throw new Error(
        "BaseRuntime requires a nodeRegistry to be provided via dependencies. " +
          "Use CloudflareRuntime for production or MockRuntime for tests."
      );
    }
    this.nodeRegistry = dependencies.nodeRegistry;

    if (dependencies?.resourceProvider) {
      this.resourceProvider = dependencies.resourceProvider;
    } else {
      // Create tool registry with a factory function for tool contexts
      // We'll pass this to ResourceProvider constructor
      let resourceProvider: ResourceProvider;
      const toolRegistry = new CloudflareToolRegistry(
        this.nodeRegistry,
        (nodeId: string, inputs: Record<string, any>) =>
          resourceProvider.createToolContext(nodeId, inputs)
      );

      // Create ResourceProvider with toolRegistry
      this.resourceProvider = resourceProvider = new ResourceProvider(
        env,
        toolRegistry
      );
    }

    this.executionStore =
      dependencies?.executionStore ?? new ExecutionStore(env);

    this.monitoringService =
      dependencies?.monitoringService ??
      new WorkflowSessionMonitoringService(env.WORKFLOW_SESSION);
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
      userId,
      organizationId,
      workflowSessionId,
      httpRequest,
      emailMessage,
      queueMessage,
      scheduledTrigger,
    } = event.payload;
    const instanceId = event.instanceId;

    // Initialise state and execution record
    let executionState: ExecutionState = {
      nodeOutputs: {},
      executedNodes: [],
      skippedNodes: [],
      nodeErrors: {},
    };
    this.logTransition("idle", "submitted");

    let executionRecord: WorkflowExecution = {
      id: instanceId,
      workflowId: event.payload.workflow.id,
      deploymentId: event.payload.deploymentId,
      status: "submitted",
      nodeExecutions: [],
      startedAt: new Date(),
      endedAt: undefined,
    } as WorkflowExecution;

    await this.monitoringService.sendUpdate(workflowSessionId, executionRecord);

    // Declare context and exhaustion flag outside try block for finally access
    let executionContext: WorkflowExecutionContext | undefined;
    let isExhausted = false;

    try {
      // Initialize workflow first (validation + ordering) to create context
      // @ts-expect-error - TS2589: Type instantiation depth limitation with Cloudflare Workflows step.do
      const { context, state } = await step.do(
        "initialise workflow",
        BaseRuntime.defaultStepConfig,
        () =>
          this.initialiseWorkflow(
            event.payload.workflow,
            event.payload.workflow.id,
            organizationId,
            instanceId,
            event.payload.deploymentId
          )
      );

      executionContext = context;
      executionState = state;

      // Check for credit exhaustion early (before resource loading)
      const computeCost = this.getNodesComputeCost(
        event.payload.workflow.nodes
      );
      if (
        !(await this.hasEnoughComputeCredits(
          organizationId,
          event.payload.computeCredits,
          computeCost
        ))
      ) {
        isExhausted = true;
        executionRecord.status = "exhausted" as any;
        executionRecord.error = "Insufficient compute credits";
        this.logTransition("submitted", "exhausted");
        await this.monitoringService.sendUpdate(
          workflowSessionId,
          executionRecord
        );
        // Skip to finally block to save
        return executionRecord;
      }

      // Preload organization resources (secrets + integrations)
      await step.do(
        "preload organization resources",
        BaseRuntime.defaultStepConfig,
        async () => this.resourceProvider.initialize(organizationId)
      );

      executionRecord.status = getExecutionStatus(
        executionContext,
        executionState
      );

      await this.monitoringService.sendUpdate(
        workflowSessionId,
        executionRecord
      );

      // Execute workflow nodes sequentially
      const { state: finalState, record: finalRecord } =
        await this.executeWorkflowNodes(
          step,
          executionContext,
          executionState,
          executionRecord,
          httpRequest,
          emailMessage,
          queueMessage,
          scheduledTrigger,
          workflowSessionId
        );

      executionState = finalState;
      executionRecord = finalRecord;
    } catch (error) {
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
      await this.monitoringService.sendUpdate(
        workflowSessionId,
        executionRecord
      );
    } finally {
      executionRecord.endedAt = new Date();

      // Save to execution store only once, at the very end
      if (executionContext) {
        executionRecord = await this.persistFinalState(
          step,
          executionContext,
          executionState,
          executionRecord,
          userId,
          organizationId,
          instanceId,
          isExhausted
        );
      }

      await this.monitoringService.sendUpdate(
        workflowSessionId,
        executionRecord
      );
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
    executionId: string,
    deploymentId?: string
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
      deploymentId,
    };

    // Mutable state
    const state: ExecutionState = {
      nodeOutputs: {},
      executedNodes: [],
      skippedNodes: [],
      nodeErrors: {},
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
   * Logs state transitions (currently disabled for minimal logging).
   */
  private logTransition(
    _from: WorkflowExecutionStatus | "idle",
    _to: WorkflowExecutionStatus | "idle"
  ): void {
    // Logging disabled for minimal output
  }

  /**
   * Finds a node in the workflow by its ID.
   */
  private findNode(workflow: Workflow, nodeId: string): Node | undefined {
    return workflow.nodes.find((n) => n.id === nodeId);
  }

  // ==========================================================================
  // NODE EXECUTION (from ExecutionEngine)
  // ==========================================================================

  /**
   * Executes or skips a single node based on its dependencies.
   * Returns updated state with node execution result embedded for introspection.
   */
  private async executeOrSkipNode(
    context: WorkflowExecutionContext,
    state: ExecutionState,
    nodeId: string,
    httpRequest?: HttpRequest,
    emailMessage?: EmailMessage,
    queueMessage?: QueueMessage,
    scheduledTrigger?: ScheduledTrigger
  ): Promise<ExecutionState> {
    // Check if node should be skipped (all upstream dependencies unavailable)
    if (this.shouldSkipNode(context, state, nodeId)) {
      // Mark as skipped
      if (!state.skippedNodes.includes(nodeId)) {
        state.skippedNodes.push(nodeId);
      }
      return state;
    }

    // Execute the node and return updated state
    return await this.executeNode(
      context,
      state,
      nodeId,
      httpRequest,
      emailMessage,
      queueMessage,
      scheduledTrigger
    );
  }

  /**
   * Executes a single node and stores its outputs.
   */
  private async executeNode(
    context: WorkflowExecutionContext,
    state: ExecutionState,
    nodeId: string,
    httpRequest?: HttpRequest,
    emailMessage?: EmailMessage,
    queueMessage?: QueueMessage,
    scheduledTrigger?: ScheduledTrigger
  ): Promise<ExecutionState> {
    const node = this.findNode(context.workflow, nodeId);
    if (!node) {
      const error = new NodeNotFoundError(nodeId);
      state = this.recordNodeError(state, nodeId, error);
      return state;
    }

    let nodeType;
    try {
      nodeType = this.nodeRegistry.getNodeType(node.type);
    } catch (_error) {
      // Node type not found in registry
      state = this.recordNodeError(
        state,
        nodeId,
        new NodeTypeNotImplementedError(nodeId, node.type)
      );
      return state;
    }

    this.env.COMPUTE.writeDataPoint({
      indexes: [context.organizationId],
      blobs: [context.organizationId, context.workflowId, node.id],
      doubles: [nodeType.computeCost ?? 1],
    });

    const executable = this.nodeRegistry.createExecutableNode(node);
    if (!executable) {
      const error = new NodeTypeNotImplementedError(nodeId, node.type);
      state = this.recordNodeError(state, nodeId, error);
      return state;
    }

    const inputValues = this.collectNodeInputs(
      context.workflow,
      state.nodeOutputs,
      nodeId
    );

    try {
      const objectStore = new ObjectStore(this.env.RESSOURCES);
      const processedInputs = await this.transformInputs(
        context.workflow,
        nodeId,
        inputValues,
        objectStore,
        context.organizationId,
        context.executionId
      );

      const nodeContext = this.resourceProvider.createNodeContext(
        nodeId,
        context.workflowId,
        context.organizationId,
        processedInputs,
        httpRequest,
        emailMessage,
        queueMessage,
        scheduledTrigger,
        context.deploymentId
      );

      const result = await executable.execute(nodeContext);

      if (result.status === "completed") {
        const outputsForRuntime = await this.transformOutputs(
          context.workflow,
          nodeId,
          result.outputs ?? {},
          objectStore,
          context.organizationId,
          context.executionId
        );
        state.nodeOutputs[nodeId] = outputsForRuntime as NodeRuntimeValues;
        if (!state.executedNodes.includes(nodeId)) {
          state.executedNodes.push(nodeId);
        }

        // Downstream nodes will be checked by shouldSkipNode when we reach them
      } else {
        const failureMessage = result.error ?? "Unknown error";
        state = this.recordNodeError(state, nodeId, failureMessage);
      }

      return state;
    } catch (error) {
      state = this.recordNodeError(
        state,
        nodeId,
        error instanceof Error ? error : new Error(String(error))
      );
      return state;
    }
  }

  /**
   * Executes all workflow nodes sequentially, updating state and sending progress notifications.
   */
  private async executeWorkflowNodes(
    step: WorkflowStep,
    context: WorkflowExecutionContext,
    state: ExecutionState,
    executionRecord: WorkflowExecution,
    httpRequest?: HttpRequest,
    emailMessage?: EmailMessage,
    queueMessage?: QueueMessage,
    scheduledTrigger?: ScheduledTrigger,
    workflowSessionId?: string
  ): Promise<{ state: ExecutionState; record: WorkflowExecution }> {
    let currentState = state;
    let currentRecord = executionRecord;

    for (const nodeId of context.orderedNodeIds) {
      // Execute or skip the node
      // The step returns a result object for introspection by waitForStepResult
      await step.do(
        `run node ${nodeId}`,
        BaseRuntime.defaultStepConfig,
        async () => {
          // Execute and get updated state
          currentState = await this.executeOrSkipNode(
            context,
            currentState,
            nodeId,
            httpRequest,
            emailMessage,
            queueMessage,
            scheduledTrigger
          );

          // Build result object for introspection
          const nodeExecution = this.buildNodeExecutions(
            context.workflow,
            context,
            currentState
          ).find((exec) => exec.nodeId === nodeId);

          return nodeExecution || { nodeId, status: "idle" };
        }
      );

      currentRecord = await this.updateAndNotify(
        workflowSessionId,
        currentRecord,
        context,
        currentState
      );
    }

    return { state: currentState, record: currentRecord };
  }

  private async transformInputs(
    workflow: Workflow,
    nodeId: string,
    inputValues: NodeRuntimeValues,
    objectStore: ObjectStore,
    organizationId: string,
    _executionId: string
  ): Promise<Record<string, any>> {
    const node = this.findNode(workflow, nodeId);
    if (!node) return {};

    const processed: Record<string, any> = {};
    for (const [name, value] of Object.entries(inputValues)) {
      const input = node.inputs.find((i) => i.name === name);
      const parameterType = input?.type ?? "string";

      // Handle repeated inputs (arrays of values)
      if (Array.isArray(value)) {
        const transformedArray = await Promise.all(
          value.map((v) =>
            apiToNodeParameter(parameterType, v, objectStore, organizationId)
          )
        );
        processed[name] = transformedArray;
      } else {
        processed[name] = await apiToNodeParameter(
          parameterType,
          value,
          objectStore,
          organizationId
        );
      }
    }
    return processed;
  }

  private async transformOutputs(
    workflow: Workflow,
    nodeId: string,
    outputs: Record<string, any>,
    objectStore: ObjectStore,
    organizationId: string,
    executionId: string
  ): Promise<Record<string, RuntimeValue>> {
    const node = this.findNode(workflow, nodeId);
    if (!node) return {};

    const processed: Record<string, RuntimeValue> = {};
    for (const [name, value] of Object.entries(outputs)) {
      const output = node.outputs.find((o) => o.name === name);
      const parameterType = output?.type ?? "string";
      processed[name] = await nodeToApiParameter(
        parameterType,
        value,
        objectStore,
        organizationId,
        executionId
      );
    }
    return processed;
  }

  private collectNodeInputs(
    workflow: Workflow,
    nodeOutputs: Record<string, NodeRuntimeValues>,
    nodeId: string
  ): NodeRuntimeValues {
    const inputs: NodeRuntimeValues = {};
    const node = this.findNode(workflow, nodeId);
    if (!node) return inputs;

    for (const input of node.inputs) {
      if (input.value !== undefined && isRuntimeValue(input.value)) {
        inputs[input.name] = input.value;
      }
    }

    const inboundEdges = workflow.edges.filter(
      (edge): boolean => edge.target === nodeId
    );
    const edgesByInput = new Map<string, typeof inboundEdges>();
    for (const edge of inboundEdges) {
      const inputName = edge.targetInput;
      if (!edgesByInput.has(inputName)) {
        edgesByInput.set(inputName, []);
      }
      edgesByInput.get(inputName)!.push(edge);
    }

    for (const [inputName, edges] of edgesByInput) {
      const executable = this.nodeRegistry.createExecutableNode(node);
      const nodeType = getNodeType(executable);
      const nodeTypeInput = nodeType?.inputs?.find(
        (input) => input.name === inputName
      );
      const acceptsMultiple = nodeTypeInput?.repeated ?? false;

      const values: RuntimeValue[] = [];
      for (const edge of edges) {
        const sourceOutputs = nodeOutputs[edge.source];
        if (sourceOutputs && sourceOutputs[edge.sourceOutput] !== undefined) {
          const value = sourceOutputs[edge.sourceOutput];
          if (isRuntimeValue(value)) {
            values.push(value);
          }
        }
      }

      if (values.length > 0) {
        inputs[inputName] = acceptsMultiple
          ? values
          : values[values.length - 1];
      }
    }

    return inputs;
  }

  /**
   * Updates execution record with current state and sends monitoring notification.
   */
  private async updateAndNotify(
    sessionId: string | undefined,
    executionRecord: WorkflowExecution,
    context: WorkflowExecutionContext,
    state: ExecutionState
  ): Promise<WorkflowExecution> {
    const updated = {
      ...executionRecord,
      status: getExecutionStatus(context, state),
      nodeExecutions: this.buildNodeExecutions(
        context.workflow,
        context,
        state
      ),
    };
    await this.monitoringService.sendUpdate(sessionId, updated);
    return updated;
  }

  // ==========================================================================
  // CREDIT MANAGEMENT
  // ==========================================================================

  /**
   * Checks if the organization has enough compute credits to execute a workflow.
   * Credit limits are not enforced in development mode.
   */
  private async hasEnoughComputeCredits(
    organizationId: string,
    computeCredits: number,
    computeCost: number
  ): Promise<boolean> {
    // Skip credit limit enforcement in development mode
    if (this.env.CLOUDFLARE_ENV === "development") {
      return true;
    }

    const computeUsage = await getOrganizationComputeUsage(
      this.env.KV,
      organizationId
    );
    return computeUsage + computeCost <= computeCredits;
  }

  /**
   * Returns the compute cost of a list of nodes.
   */
  private getNodesComputeCost(nodes: Node[]): number {
    return nodes.reduce((acc, node) => {
      try {
        const nodeType = this.nodeRegistry.getNodeType(node.type);
        return acc + (nodeType.computeCost ?? 1);
      } catch (_error) {
        // Node type not found in registry, use default cost
        return acc + 1;
      }
    }, 0);
  }

  /**
   * Persists the final execution state with credit updates.
   * This is the ONLY place where executionStore.save() should be called.
   */
  private async persistFinalState(
    step: WorkflowStep,
    context: WorkflowExecutionContext,
    state: ExecutionState,
    executionRecord: WorkflowExecution,
    userId: string,
    organizationId: string,
    instanceId: string,
    isExhausted: boolean
  ): Promise<WorkflowExecution> {
    return await step.do(
      "persist final execution record",
      BaseRuntime.defaultStepConfig,
      async () => {
        // Compute final status
        const finalStatus = isExhausted
          ? ("exhausted" as any)
          : getExecutionStatus(context, state);

        // Update compute credits for executed nodes (skip in development and exhausted cases)
        if (!isExhausted && this.env.CLOUDFLARE_ENV !== "development") {
          await updateOrganizationComputeUsage(
            this.env.KV,
            organizationId,
            this.getNodesComputeCost(
              context.workflow.nodes.filter((node) =>
                state.executedNodes.includes(node.id)
              )
            )
          );
        }

        // Save to execution store - this happens exactly once per execution
        return this.executionStore.save({
          id: instanceId,
          workflowId: context.workflowId,
          userId,
          organizationId,
          status: finalStatus,
          nodeExecutions: this.buildNodeExecutions(
            context.workflow,
            context,
            state
          ),
          error: this.createErrorReport(state) ?? executionRecord.error,
          startedAt: executionRecord.startedAt,
          endedAt: executionRecord.endedAt,
        });
      }
    );
  }

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  private recordNodeError(
    state: ExecutionState,
    nodeId: string,
    error: Error | string
  ): ExecutionState {
    const errorMessage = error instanceof Error ? error.message : String(error);
    state.nodeErrors[nodeId] = errorMessage;
    return state;
  }

  private createErrorReport(state: ExecutionState): string | undefined {
    if (Object.keys(state.nodeErrors).length === 0) {
      return undefined;
    }
    return "Workflow execution failed";
  }

  /**
   * Determines if a node should be skipped.
   * A node is skipped if:
   * - It has already been marked as skipped or errored
   * - ALL upstream dependencies are unavailable (errored, skipped, or didn't populate outputs)
   *
   * This logic allows nodes like ConditionalJoin to execute with partial inputs when some
   * branches are inactive, while still propagating errors and cascading skips.
   */
  private shouldSkipNode(
    context: WorkflowExecutionContext,
    state: ExecutionState,
    nodeId: string
  ): boolean {
    // Already skipped or errored
    if (state.skippedNodes.includes(nodeId) || nodeId in state.nodeErrors) {
      return true;
    }

    const node = this.findNode(context.workflow, nodeId);
    if (!node) return false;

    // Get all inbound edges
    const inboundEdges = context.workflow.edges.filter(
      (edge) => edge.target === nodeId
    );

    // If no inbound edges, node can execute (uses only static inputs)
    if (inboundEdges.length === 0) {
      return false;
    }

    // Check if ALL upstream dependencies are unavailable
    // This allows join nodes to execute with partial inputs while still cascading errors
    const allUpstreamUnavailable = inboundEdges.every((edge) => {
      // Upstream errored
      if (edge.source in state.nodeErrors) {
        return true;
      }

      // Upstream was skipped
      if (state.skippedNodes.includes(edge.source)) {
        return true;
      }

      // Upstream executed but didn't populate this specific output (conditional branch)
      if (state.executedNodes.includes(edge.source)) {
        const sourceOutputs = state.nodeOutputs[edge.source];
        if (sourceOutputs && !(edge.sourceOutput in sourceOutputs)) {
          return true;
        }
      }

      // Upstream executed and populated output - this input is available
      return false;
    });

    return allUpstreamUnavailable;
  }

  // ==========================================================================
  // NODE EXECUTION LIST BUILDER
  // ==========================================================================

  /**
   * Builds node execution list from execution state.
   * Maps workflow nodes to their execution status for persistence and monitoring.
   * For skipped nodes, infers skip reason and details from state.
   */
  private buildNodeExecutions(
    workflow: Workflow,
    context: WorkflowExecutionContext,
    state: ExecutionState
  ) {
    // Determine if workflow is still running
    const isStillRunning = getExecutionStatus(context, state) === "executing";

    return workflow.nodes.map((node) => {
      if (state.executedNodes.includes(node.id)) {
        return {
          nodeId: node.id,
          status: "completed" as const,
          outputs: state.nodeOutputs[node.id] || {},
        };
      }
      if (node.id in state.nodeErrors) {
        return {
          nodeId: node.id,
          status: "error" as const,
          error: state.nodeErrors[node.id],
        };
      }
      if (state.skippedNodes.includes(node.id)) {
        // Infer skip reason and details from state
        const skipInfo = this.inferSkipReason(workflow, state, node.id);
        return {
          nodeId: node.id,
          status: "skipped" as const,
          outputs: null,
          ...skipInfo,
        };
      }
      // If node hasn't been processed yet:
      // - If workflow is still running, mark as "executing"
      // - If workflow has completed/errored, mark as "idle" (never reached)
      return {
        nodeId: node.id,
        status: isStillRunning ? ("executing" as const) : ("idle" as const),
      };
    });
  }

  /**
   * Infers skip reason and details for a skipped node.
   * Checks for:
   * - Upstream errors
   * - Upstream skips (cascading)
   * - Conditional branches (upstream node succeeded but didn't populate the connected output)
   */
  private inferSkipReason(
    workflow: Workflow,
    state: ExecutionState,
    nodeId: string
  ): {
    skipReason?: string;
    blockedBy?: string[];
  } {
    const node = workflow.nodes.find((n) => n.id === nodeId);
    if (!node) return {};

    // Check for upstream errors, skips, and conditional branches
    const inboundEdges = workflow.edges.filter(
      (edge) => edge.target === nodeId
    );
    const erroredUpstream: string[] = [];
    const skippedUpstream: string[] = [];
    const conditionalSkip: string[] = [];

    for (const edge of inboundEdges) {
      // Upstream error
      if (edge.source in state.nodeErrors) {
        erroredUpstream.push(edge.source);
      }
      // Upstream was skipped (cascading skip)
      else if (state.skippedNodes.includes(edge.source)) {
        skippedUpstream.push(edge.source);
      }
      // Conditional skip (upstream succeeded but didn't populate this output)
      else if (state.executedNodes.includes(edge.source)) {
        const sourceOutputs = state.nodeOutputs[edge.source];
        if (sourceOutputs && !(edge.sourceOutput in sourceOutputs)) {
          conditionalSkip.push(edge.source);
        }
      }
    }

    // Prioritize upstream errors, then cascading skips, then conditional branches
    if (erroredUpstream.length > 0 || skippedUpstream.length > 0) {
      return {
        skipReason: "upstream_failure",
        blockedBy: [...erroredUpstream, ...skippedUpstream],
      };
    }

    if (conditionalSkip.length > 0) {
      return {
        skipReason: "conditional_branch",
        blockedBy: conditionalSkip,
      };
    }

    return {};
  }
}
