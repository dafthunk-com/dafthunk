import { NonRetryableError } from "cloudflare:workflows";
import type {
  Node,
  QueueMessage,
  ScheduledTrigger,
  Workflow,
  WorkflowExecution,
  WorkflowExecutionStatus,
} from "@dafthunk/types";

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
import { validateWorkflow } from "../utils/workflows";
import { CreditService, KVCreditService } from "./credit-service";
import { ResourceProvider } from "./resource-provider";
import type {
  ExecutionLevel,
  ExecutionState,
  NodeExecutionResult,
  NodeRuntimeValues,
  RuntimeValue,
  WorkflowExecutionContext,
} from "./types";
import {
  applyNodeResult,
  getExecutionStatus,
  getNodeType,
  inferSkipReason,
  isRuntimeValue,
  NodeNotFoundError,
  NodeTypeNotImplementedError,
  SubscriptionRequiredError,
} from "./types";

export interface RuntimeParams {
  readonly workflow: Workflow;
  readonly userId: string;
  readonly organizationId: string;
  readonly computeCredits: number;
  readonly subscriptionStatus?: string;
  /** Maximum additional usage allowed beyond included credits. null = unlimited */
  readonly overageLimit?: number | null;
  readonly workflowSessionId?: string;
  readonly deploymentId?: string;
  readonly httpRequest?: HttpRequest;
  readonly emailMessage?: EmailMessage;
  readonly queueMessage?: QueueMessage;
  readonly scheduledTrigger?: ScheduledTrigger;
  readonly userPlan?: string;
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
  creditService?: CreditService;
}

/**
 * Base Runtime - Abstract Workflow Execution Engine
 *
 * Base class for executing Workflow instances from start to finish.
 * Provides core execution logic with dependency injection support.
 *
 * This class should not be instantiated directly. Use:
 * - {@link WorkflowRuntime} for production deployments
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
export abstract class BaseRuntime {
  protected nodeRegistry: BaseNodeRegistry;
  protected resourceProvider: ResourceProvider;
  protected executionStore: ExecutionStore;
  protected monitoringService: MonitoringService;
  protected creditService: CreditService;
  protected env: Bindings;
  protected userPlan?: string;

  constructor(env: Bindings, dependencies?: RuntimeDependencies) {
    this.env = env;

    // Use injected dependencies or create defaults
    // Note: We can't use CloudflareNodeRegistry here directly because importing it
    // would pull in all node types (including geotiff with node:https).
    // Instead, we require nodeRegistry to be provided when using BaseRuntime.
    if (!dependencies?.nodeRegistry) {
      throw new Error(
        "BaseRuntime requires a nodeRegistry to be provided via dependencies. " +
          "Use WorkflowRuntime for production or MockRuntime for tests."
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

    this.creditService =
      dependencies?.creditService ??
      new KVCreditService(env.KV, env.CLOUDFLARE_ENV === "development");
  }

  /**
   * Abstract method for executing a step with platform-specific durability.
   *
   * ## Contract for Implementations
   *
   * **Durability**: The step result should be persisted so that if the workflow
   * restarts, the step can be skipped and its cached result returned. This is
   * how Cloudflare Workflows achieves exactly-once semantics.
   *
   * **Serialization**: The return type T must be JSON-serializable. Cloudflare
   * Workflows persists step results to durable storage between executions.
   * Non-serializable values (functions, classes, circular refs) will fail.
   *
   * **Idempotency**: The provided function `fn` should be idempotent or
   * tolerate retries. Platform implementations may retry on transient failures.
   *
   * **Error Handling**: Errors thrown by `fn` should propagate to the caller.
   * Implementations may add retry logic for transient errors (network timeouts)
   * but should not swallow or transform application errors.
   *
   * @param name - Human-readable step identifier. Used for logging and the
   *               Cloudflare Workflows introspection API. Convention: lowercase
   *               with spaces (e.g., "run node abc123", "persist final state").
   * @param fn - Async function to execute. Must return JSON-serializable value.
   * @returns The result of fn, either fresh or from durable cache on replay.
   */
  protected abstract executeStep<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T>;

  /**
   * The main entrypoint for workflow execution.
   *
   * Error handling strategy:
   * - Workflow-level errors (validation, cycles) → throw NonRetryableError
   * - Node execution failures → stored in nodeErrors, workflow continues
   * - Exceptions during node execution → caught, workflow status set to "error"
   * - All errors transmitted to client via monitoring service
   */
  async run(
    params: RuntimeParams,
    instanceId: string
  ): Promise<WorkflowExecution> {
    const {
      userId,
      organizationId,
      workflowSessionId,
      workflow,
      computeCredits,
      subscriptionStatus,
      overageLimit,
      deploymentId,
      httpRequest,
      emailMessage,
      queueMessage,
      scheduledTrigger,
      userPlan,
    } = params;

    this.userPlan = userPlan;

    // Initialise state and execution record
    let executionState: ExecutionState = {
      nodeOutputs: {},
      executedNodes: [],
      skippedNodes: [],
      nodeErrors: {},
      nodeUsage: {},
    };
    this.logTransition("idle", "submitted");

    let executionRecord: WorkflowExecution = {
      id: instanceId,
      workflowId: workflow.id,
      deploymentId: deploymentId,
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
      const { context, state } = await this.executeStep(
        "initialise workflow",
        () =>
          this.initialiseWorkflow(
            workflow,
            workflow.id,
            organizationId,
            instanceId,
            deploymentId
          )
      );

      executionContext = context;
      executionState = state;

      // Check for credit exhaustion early (before resource loading)
      const estimatedUsage = this.getNodesUsage(workflow.nodes);
      if (
        !(await this.hasEnoughComputeCredits(
          organizationId,
          computeCredits,
          estimatedUsage,
          subscriptionStatus,
          overageLimit
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
      await this.executeStep("preload organization resources", async () =>
        this.resourceProvider.initialize(organizationId)
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
   * Validates the workflow and creates execution levels for parallel execution.
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

    const executionLevels = this.createTopologicalLevels(workflow);
    if (executionLevels.length === 0 && workflow.nodes.length > 0) {
      throw new NonRetryableError(
        "Unable to derive execution order. The graph may contain a cycle."
      );
    }

    // Derive flat ordered list from levels (for getExecutionStatus compatibility)
    const orderedNodeIds = executionLevels.flatMap((level) => level.nodeIds);

    // Immutable context
    const context: WorkflowExecutionContext = {
      workflow,
      executionLevels,
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
      nodeUsage: {},
    };

    // Log transition to executing
    this.logTransition(getExecutionStatus(context, state), "executing");

    return { context, state };
  }

  /**
   * Calculates a topological ordering of nodes grouped by execution level.
   * Nodes within the same level have no dependencies on each other and can execute in parallel.
   * Returns an empty array if a cycle is detected.
   *
   * Uses a modified Kahn's algorithm that tracks levels instead of a flat queue:
   * - Level 0: All nodes with in-degree 0 (no dependencies)
   * - Level N: Nodes whose dependencies are all in levels 0 to N-1
   */
  private createTopologicalLevels(workflow: Workflow): ExecutionLevel[] {
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

    // Start with all nodes that have no dependencies (in-degree 0)
    let currentLevel: string[] = Object.keys(inDegree).filter(
      (id) => inDegree[id] === 0
    );

    const levels: ExecutionLevel[] = [];
    let processedCount = 0;

    while (currentLevel.length > 0) {
      levels.push({ nodeIds: [...currentLevel] });
      processedCount += currentLevel.length;

      // Find next level: nodes whose in-degree becomes 0 after processing current level
      const nextLevel: string[] = [];

      for (const nodeId of currentLevel) {
        for (const neighbour of adjacency[nodeId]) {
          inDegree[neighbour] -= 1;
          if (inDegree[neighbour] === 0) {
            nextLevel.push(neighbour);
          }
        }
      }

      currentLevel = nextLevel;
    }

    // If we didn't process all nodes, a cycle exists
    return processedCount === workflow.nodes.length ? levels : [];
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
   * Returns a result describing what happened - no state mutation.
   */
  private async executeOrSkipNode(
    context: WorkflowExecutionContext,
    state: ExecutionState,
    nodeId: string,
    httpRequest?: HttpRequest,
    emailMessage?: EmailMessage,
    queueMessage?: QueueMessage,
    scheduledTrigger?: ScheduledTrigger
  ): Promise<NodeExecutionResult> {
    // Check if node should be skipped (all upstream dependencies unavailable)
    if (this.shouldSkipNode(context, state, nodeId)) {
      // Include skip reason for Workflows introspection API
      const { reason, blockedBy } = inferSkipReason(
        context.workflow,
        state,
        nodeId
      );
      return {
        nodeId,
        status: "skipped",
        outputs: null,
        usage: 0,
        skipReason: reason,
        blockedBy: [...blockedBy],
      };
    }

    // Execute the node and return result
    return await this.executeNode(
      context,
      state.nodeOutputs,
      nodeId,
      httpRequest,
      emailMessage,
      queueMessage,
      scheduledTrigger
    );
  }

  /**
   * Executes a single node and returns the result.
   * Pure function: reads from nodeOutputs but does not mutate any state.
   */
  private async executeNode(
    context: WorkflowExecutionContext,
    nodeOutputs: Record<string, NodeRuntimeValues>,
    nodeId: string,
    httpRequest?: HttpRequest,
    emailMessage?: EmailMessage,
    queueMessage?: QueueMessage,
    scheduledTrigger?: ScheduledTrigger
  ): Promise<NodeExecutionResult> {
    const node = this.findNode(context.workflow, nodeId);
    if (!node) {
      return {
        nodeId,
        status: "error",
        error: new NodeNotFoundError(nodeId).message,
      };
    }

    let nodeType;
    try {
      nodeType = this.nodeRegistry.getNodeType(node.type);
    } catch (_error) {
      return {
        nodeId,
        status: "error",
        error: new NodeTypeNotImplementedError(nodeId, node.type).message,
      };
    }

    // Check if this is a subscription-only node and user doesn't have a paid plan
    if (nodeType.subscription && this.userPlan !== "pro") {
      return {
        nodeId,
        status: "error",
        error: new SubscriptionRequiredError(nodeId, node.type).message,
      };
    }

    const executable = this.nodeRegistry.createExecutableNode(node);
    if (!executable) {
      return {
        nodeId,
        status: "error",
        error: new NodeTypeNotImplementedError(nodeId, node.type).message,
      };
    }

    const inputValues = this.collectNodeInputs(
      context.workflow,
      nodeOutputs,
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
        return {
          nodeId,
          status: "completed",
          outputs: outputsForRuntime as NodeRuntimeValues,
          usage: result.usage ?? nodeType.usage ?? 1,
        };
      } else {
        return {
          nodeId,
          status: "error",
          error: result.error ?? "Unknown error",
          usage: result.usage,
        };
      }
    } catch (error) {
      return {
        nodeId,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Executes workflow nodes in parallel within each execution level.
   * Nodes at the same level have no dependencies on each other and can run concurrently.
   * Each node gets its own durable step for Cloudflare Workflows compatibility.
   *
   * Uses immutable results: each node execution returns a NodeExecutionResult,
   * which is then applied to the state. No state copying or merging required.
   */
  private async executeWorkflowNodes(
    context: WorkflowExecutionContext,
    state: ExecutionState,
    executionRecord: WorkflowExecution,
    httpRequest?: HttpRequest,
    emailMessage?: EmailMessage,
    queueMessage?: QueueMessage,
    scheduledTrigger?: ScheduledTrigger,
    workflowSessionId?: string
  ): Promise<{ state: ExecutionState; record: WorkflowExecution }> {
    let currentRecord = executionRecord;

    for (const level of context.executionLevels) {
      // Execute all nodes in this level in parallel, collecting results
      const results = await Promise.all(
        level.nodeIds.map(async (nodeId) => {
          // Each node gets its own durable step
          const result = await this.executeStep(
            `run node ${nodeId}`,
            async () => {
              return this.executeOrSkipNode(
                context,
                state,
                nodeId,
                httpRequest,
                emailMessage,
                queueMessage,
                scheduledTrigger
              );
            }
          );

          return result;
        })
      );

      // Apply all results to state (nodes in same level don't affect each other)
      for (const result of results) {
        applyNodeResult(state, result);
      }

      // Send progress update after level completes
      currentRecord = await this.updateAndNotify(
        workflowSessionId,
        currentRecord,
        context,
        state
      );
    }

    return { state, record: currentRecord };
  }

  private async transformInputs(
    workflow: Workflow,
    nodeId: string,
    inputValues: NodeRuntimeValues,
    objectStore: ObjectStore,
    _organizationId: string,
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
          value.map((v) => apiToNodeParameter(parameterType, v, objectStore))
        );
        processed[name] = transformedArray;
      } else {
        processed[name] = await apiToNodeParameter(
          parameterType,
          value,
          objectStore
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

      // Handle repeated outputs (arrays of values)
      if (output?.repeated && Array.isArray(value)) {
        const transformedArray = await Promise.all(
          value.map((v) =>
            nodeToApiParameter(
              parameterType,
              v,
              objectStore,
              organizationId,
              executionId
            )
          )
        );
        processed[name] = transformedArray;
      } else {
        processed[name] = await nodeToApiParameter(
          parameterType,
          value,
          objectStore,
          organizationId,
          executionId
        );
      }
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
          // If the source output is an array (repeated output), flatten it into values
          if (Array.isArray(value)) {
            for (const item of value) {
              if (isRuntimeValue(item)) {
                values.push(item);
              }
            }
          } else if (isRuntimeValue(value)) {
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
   * Delegates to the injected CreditService for actual credit logic.
   */
  private async hasEnoughComputeCredits(
    organizationId: string,
    computeCredits: number,
    estimatedUsage: number,
    subscriptionStatus?: string,
    overageLimit?: number | null
  ): Promise<boolean> {
    return this.creditService.hasEnoughCredits({
      organizationId,
      computeCredits,
      estimatedUsage,
      subscriptionStatus,
      overageLimit,
    });
  }

  /**
   * Returns the estimated usage for a list of nodes.
   */
  private getNodesUsage(nodes: Node[]): number {
    return nodes.reduce((acc, node) => {
      try {
        const nodeType = this.nodeRegistry.getNodeType(node.type);
        return acc + (nodeType.usage ?? 1);
      } catch (_error) {
        // Node type not found in registry, use default usage
        return acc + 1;
      }
    }, 0);
  }

  /**
   * Persists the final execution state with credit updates.
   * This is the ONLY place where executionStore.save() should be called.
   */
  private async persistFinalState(
    context: WorkflowExecutionContext,
    state: ExecutionState,
    executionRecord: WorkflowExecution,
    userId: string,
    organizationId: string,
    instanceId: string,
    isExhausted: boolean
  ): Promise<WorkflowExecution> {
    return await this.executeStep(
      "persist final execution record",
      async () => {
        // Compute final status
        const finalStatus = isExhausted
          ? ("exhausted" as any)
          : getExecutionStatus(context, state);

        // Record actual usage (creditService handles dev mode check internally)
        if (!isExhausted) {
          const actualTotalUsage = Object.values(state.nodeUsage).reduce(
            (sum, usage) => sum + usage,
            0
          );
          await this.creditService.recordUsage(organizationId, actualTotalUsage);
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

  private createErrorReport(state: ExecutionState): string | undefined {
    if (Object.keys(state.nodeErrors).length === 0) {
      return undefined;
    }
    return "Workflow execution failed";
  }

  /**
   * Analysis result for a node's upstream dependencies.
   * Used by both skip detection and skip reason inference.
   */
  private analyzeUpstreamDependencies(
    workflow: Workflow,
    state: ExecutionState,
    nodeId: string
  ): {
    allUnavailable: boolean;
    erroredUpstream: string[];
    skippedUpstream: string[];
    conditionalSkip: string[];
  } {
    const inboundEdges = workflow.edges.filter(
      (edge) => edge.target === nodeId
    );

    // No dependencies means the node can execute
    if (inboundEdges.length === 0) {
      return {
        allUnavailable: false,
        erroredUpstream: [],
        skippedUpstream: [],
        conditionalSkip: [],
      };
    }

    const erroredUpstream: string[] = [];
    const skippedUpstream: string[] = [];
    const conditionalSkip: string[] = [];

    for (const edge of inboundEdges) {
      // Upstream errored
      if (edge.source in state.nodeErrors) {
        erroredUpstream.push(edge.source);
        continue;
      }

      // Upstream was skipped
      if (state.skippedNodes.includes(edge.source)) {
        skippedUpstream.push(edge.source);
        continue;
      }

      // Upstream executed but didn't populate this specific output (conditional branch)
      if (state.executedNodes.includes(edge.source)) {
        const sourceOutputs = state.nodeOutputs[edge.source];
        if (sourceOutputs && !(edge.sourceOutput in sourceOutputs)) {
          conditionalSkip.push(edge.source);
          continue;
        }
      }

      // This edge has available data - not all upstream are unavailable
    }

    const unavailableCount =
      erroredUpstream.length + skippedUpstream.length + conditionalSkip.length;

    return {
      allUnavailable: unavailableCount === inboundEdges.length,
      erroredUpstream,
      skippedUpstream,
      conditionalSkip,
    };
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

    const analysis = this.analyzeUpstreamDependencies(
      context.workflow,
      state,
      nodeId
    );
    return analysis.allUnavailable;
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
          usage: state.nodeUsage[node.id] ?? 0,
        };
      }
      if (node.id in state.nodeErrors) {
        return {
          nodeId: node.id,
          status: "error" as const,
          error: state.nodeErrors[node.id],
          usage: state.nodeUsage[node.id] ?? 0,
        };
      }
      if (state.skippedNodes.includes(node.id)) {
        // Infer skip reason and details from state
        const { reason, blockedBy } = inferSkipReason(workflow, state, node.id);
        return {
          nodeId: node.id,
          status: "skipped" as const,
          outputs: null,
          usage: 0,
          skipReason: reason,
          blockedBy: [...blockedBy],
        };
      }
      // If node hasn't been processed yet:
      // - If workflow is still running, mark as "executing"
      // - If workflow has completed/errored, mark as "idle" (never reached)
      return {
        nodeId: node.id,
        status: isStillRunning ? ("executing" as const) : ("idle" as const),
        usage: 0,
      };
    });
  }
}
