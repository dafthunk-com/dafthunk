import type {
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
import { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import { CloudflareToolRegistry } from "../nodes/cloudflare-tool-registry";
import {
  apiToNodeParameter,
  nodeToApiParameter,
} from "../nodes/parameter-mapper";
import { HttpRequest } from "../nodes/types";
import { EmailMessage } from "../nodes/types";
import { ObjectStore } from "../stores/object-store";
import { updateOrganizationComputeUsage } from "../utils/credits";
import { validateWorkflow } from "../utils/workflows";
import { CreditManager } from "./credit-manager";
import { ExecutionMonitoring } from "./execution-monitoring";
import { ExecutionPersistence } from "./execution-persistence";
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
  private persistence: ExecutionPersistence;
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
    this.resourceProvider = resourceProvider = new ResourceProvider(
      env,
      toolRegistry
    );

    // Initialize other components
    this.creditManager = new CreditManager(env, this.nodeRegistry);
    this.persistence = new ExecutionPersistence(env, this);
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
      executionRecord.status = getExecutionStatus(
        executionContext,
        executionState
      );

      // Send executing state update
      await monitoring.sendUpdate(executionRecord);

      // Execute nodes sequentially
      for (const nodeId of executionContext.orderedNodeIds) {
        if (this.shouldSkipNode(executionState, nodeId)) {
          continue; // Skip nodes that were already marked as failed.
        }

        executionState = await step.do(
          `run node ${nodeId}`,
          Runtime.defaultStepConfig,
          async () =>
            this.executeNode(
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
        this.logStatusTransition(executionContext, executionState);
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
    from: WorkflowExecutionStatus | "idle",
    to: WorkflowExecutionStatus | "idle"
  ): void {
    if (this.isDevelopment && from !== to) {
      console.log(`[State Transition] ${from} → ${to}`);
    }
  }

  // ==========================================================================
  // NODE EXECUTION (from ExecutionEngine)
  // ==========================================================================

  /**
   * Executes a single node and stores its outputs.
   */
  private async executeNode(
    context: WorkflowExecutionContext,
    state: ExecutionState,
    nodeId: string,
    httpRequest?: HttpRequest,
    emailMessage?: EmailMessage
  ): Promise<ExecutionState> {
    const node = context.workflow.nodes.find((n): boolean => n.id === nodeId);
    if (!node) {
      const error = new NodeNotFoundError(nodeId);
      state = this.recordNodeError(state, nodeId, error);
      this.logStatusTransition(context, state);
      return state;
    }

    const nodeType = this.nodeRegistry.getNodeType(node.type);
    this.env.COMPUTE.writeDataPoint({
      indexes: [context.organizationId],
      blobs: [context.organizationId, context.workflowId, node.id],
      doubles: [nodeType.computeCost ?? 1],
    });

    const executable = this.nodeRegistry.createExecutableNode(node);
    if (!executable) {
      const error = new NodeTypeNotImplementedError(nodeId, node.type);
      state = this.recordNodeError(state, nodeId, error);
      this.logStatusTransition(context, state);
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
        emailMessage
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
        state.nodeOutputs.set(nodeId, outputsForRuntime as NodeRuntimeValues);
        state.executedNodes.add(nodeId);

        state = this.skipInactiveOutputs(
          context,
          state,
          nodeId,
          result.outputs ?? {}
        );
      } else {
        const failureMessage = result.error ?? "Unknown error";
        state = this.recordNodeError(state, nodeId, failureMessage);
      }

      this.logStatusTransition(context, state);
      return state;
    } catch (error) {
      state = this.recordNodeError(
        state,
        nodeId,
        error instanceof Error ? error : new Error(String(error))
      );
      this.logStatusTransition(context, state);
      return state;
    }
  }

  private async transformInputs(
    workflow: Workflow,
    nodeId: string,
    inputValues: NodeRuntimeValues,
    objectStore: ObjectStore,
    _organizationId: string,
    _executionId: string
  ): Promise<Record<string, any>> {
    const node = workflow.nodes.find((n) => n.id === nodeId);
    if (!node) return {};

    const processed: Record<string, any> = {};
    for (const [name, value] of Object.entries(inputValues)) {
      const input = node.inputs.find((i) => i.name === name);
      const parameterType = input?.type ?? "string";
      processed[name] = await apiToNodeParameter(
        parameterType,
        value,
        objectStore
      );
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
    const node = workflow.nodes.find((n) => n.id === nodeId);
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
    nodeOutputs: Map<string, NodeRuntimeValues>,
    nodeId: string
  ): NodeRuntimeValues {
    const inputs: NodeRuntimeValues = {};
    const node = workflow.nodes.find((n): boolean => n.id === nodeId);
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
        const sourceOutputs = nodeOutputs.get(edge.source);
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

  private skipInactiveOutputs(
    context: WorkflowExecutionContext,
    state: ExecutionState,
    nodeId: string,
    nodeOutputs: Record<string, unknown>
  ): ExecutionState {
    const node = context.workflow.nodes.find((n) => n.id === nodeId);
    if (!node) return state;

    const inactiveOutputs = node.outputs
      .map((output) => output.name)
      .filter((outputName) => !(outputName in nodeOutputs));

    if (inactiveOutputs.length === 0) return state;

    const inactiveEdges = context.workflow.edges.filter(
      (edge) =>
        edge.source === nodeId && inactiveOutputs.includes(edge.sourceOutput)
    );

    for (const edge of inactiveEdges) {
      this.skipIfMissingInputs(context, state, edge.target);
    }

    return state;
  }

  private skipIfMissingInputs(
    context: WorkflowExecutionContext,
    state: ExecutionState,
    nodeId: string
  ): void {
    if (state.skippedNodes.has(nodeId) || state.executedNodes.has(nodeId)) {
      return;
    }

    const node = context.workflow.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const allRequiredInputsSatisfied = this.hasAllRequiredInputs(
      context,
      state,
      nodeId
    );

    if (!allRequiredInputsSatisfied) {
      state.skippedNodes.add(nodeId);

      const outgoingEdges = context.workflow.edges.filter(
        (edge) => edge.source === nodeId
      );
      for (const edge of outgoingEdges) {
        this.skipIfMissingInputs(context, state, edge.target);
      }
    }
  }

  private hasAllRequiredInputs(
    context: WorkflowExecutionContext,
    state: ExecutionState,
    nodeId: string
  ): boolean {
    const node = context.workflow.nodes.find((n) => n.id === nodeId);
    if (!node) return false;

    const executable = this.nodeRegistry.createExecutableNode(node);
    if (!executable) return false;

    const nodeType = getNodeType(executable);
    if (!nodeType) return false;

    const inputValues = this.collectNodeInputs(
      context.workflow,
      state.nodeOutputs,
      nodeId
    );

    for (const input of nodeType.inputs) {
      if (input.required && inputValues[input.name] === undefined) {
        return false;
      }
    }

    return true;
  }

  // ==========================================================================
  // ERROR HANDLING (from ErrorHandler)
  // ==========================================================================

  recordNodeError(
    state: ExecutionState,
    nodeId: string,
    error: Error | string
  ): ExecutionState {
    const errorMessage = error instanceof Error ? error.message : String(error);
    state.nodeErrors.set(nodeId, errorMessage);
    return state;
  }

  createErrorReport(state: ExecutionState): string | undefined {
    if (state.nodeErrors.size === 0) {
      return undefined;
    }
    return "Workflow execution failed";
  }

  shouldSkipNode(state: ExecutionState, nodeId: string): boolean {
    return state.nodeErrors.has(nodeId) || state.skippedNodes.has(nodeId);
  }

  private logStatusTransition(
    context: WorkflowExecutionContext,
    state: ExecutionState
  ): void {
    const status = getExecutionStatus(context, state);

    if (this.isDevelopment) {
      if (status === "completed") {
        console.log("[State Transition] executing → completed");
      } else if (status === "error") {
        console.log("[State Transition] executing → error");
      }
    }
  }
}
