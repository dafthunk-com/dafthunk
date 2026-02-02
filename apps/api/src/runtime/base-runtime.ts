import { NonRetryableError } from "cloudflare:workflows";
import type {
  Node,
  QueueMessage,
  ScheduledTrigger,
  Workflow,
  WorkflowExecution,
} from "@dafthunk/types";

import { Bindings } from "../context";
import { BaseNodeRegistry } from "../nodes/base-node-registry";
import { CloudflareToolRegistry } from "../nodes/cloudflare-tool-registry";
import { ExecutionStore } from "./execution-store";
import { ObjectStore } from "./object-store";
import { validateWorkflow } from "../utils/workflows";
import { CredentialService } from "./credential-service";
import { CreditService } from "./credit-service";
import type {
  ExecutionLevel,
  ExecutionState,
  NodeExecutionResult,
  NodeRuntimeValues,
  RuntimeValue,
  WorkflowExecutionContext,
} from "./execution-types";
import {
  applyNodeResult,
  getExecutionStatus,
  getNodeType,
  inferSkipReason,
  isRuntimeValue,
  NodeNotFoundError,
  NodeTypeNotImplementedError,
  SubscriptionRequiredError,
} from "./execution-types";
import {
  MonitoringService,
  WorkflowSessionMonitoringService,
} from "./monitoring-service";
import { EmailMessage, HttpRequest } from "./node-types";
import { apiToNodeParameter, nodeToApiParameter } from "./parameter-mapper";

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
 * Injectable dependencies for Runtime.
 * Allows overriding default implementations for testing.
 */
export interface RuntimeDependencies {
  nodeRegistry?: BaseNodeRegistry;
  credentialProvider?: CredentialService;
  executionStore?: ExecutionStore;
  monitoringService?: MonitoringService;
  creditService?: CreditService;
}

/**
 * Abstract Workflow Execution Engine
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
 * - credentialProvider: Manages credentials (secrets, integrations, OAuth tokens)
 * - executionStore: Persists workflow execution state
 * - monitoringService: Sends real-time execution updates
 */
export abstract class Runtime {
  protected nodeRegistry: BaseNodeRegistry;
  protected credentialProvider: CredentialService;
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
    // Instead, we require nodeRegistry to be provided when using Runtime.
    if (!dependencies?.nodeRegistry) {
      throw new Error(
        "Runtime requires a nodeRegistry to be provided via dependencies. " +
          "Use WorkflowRuntime for production or MockRuntime for tests."
      );
    }
    this.nodeRegistry = dependencies.nodeRegistry;

    if (dependencies?.credentialProvider) {
      this.credentialProvider = dependencies.credentialProvider;
    } else {
      // Create tool registry with a factory function for tool contexts
      // We'll pass this to CredentialService constructor
      let credentialProvider: CredentialService;
      const toolRegistry = new CloudflareToolRegistry(
        this.nodeRegistry,
        (nodeId: string, inputs: Record<string, any>) =>
          credentialProvider.createToolContext(nodeId, inputs)
      );

      // Create CredentialService with toolRegistry
      this.credentialProvider = credentialProvider = new CredentialService(
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
      new CreditService(env.KV, env.CLOUDFLARE_ENV === "development");
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
   * Orchestrates the complete workflow lifecycle:
   * 1. Validates workflow and creates execution levels (topological sort)
   * 2. Checks compute credit availability
   * 3. Preloads organization resources (secrets + integrations)
   * 4. Executes nodes level-by-level with parallel execution within levels
   * 5. Persists final state with credit usage
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
      // ========================================================================
      // STEP 1: Validate workflow and create execution levels
      // ========================================================================
      const { context, state } = await this.executeStep(
        "initialise workflow",
        async () => {
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
          const orderedNodeIds = executionLevels.flatMap(
            (level) => level.nodeIds
          );

          // Immutable context
          const context: WorkflowExecutionContext = {
            workflow,
            executionLevels,
            orderedNodeIds,
            workflowId: workflow.id,
            organizationId,
            executionId: instanceId,
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

          return { context, state };
        }
      );

      executionContext = context;
      executionState = state;

      // ========================================================================
      // STEP 2: Check compute credit availability
      // ========================================================================
      const estimatedUsage = workflow.nodes.reduce((acc, node) => {
        try {
          const nodeType = this.nodeRegistry.getNodeType(node.type);
          return acc + (nodeType.usage ?? 1);
        } catch (_error) {
          return acc + 1;
        }
      }, 0);

      const hasCredits = await this.creditService.hasEnoughCredits({
        organizationId,
        computeCredits,
        estimatedUsage,
        subscriptionStatus,
        overageLimit,
      });

      if (!hasCredits) {
        isExhausted = true;
        executionRecord.status = "exhausted" as any;
        executionRecord.error = "Insufficient compute credits";
        await this.monitoringService.sendUpdate(
          workflowSessionId,
          executionRecord
        );
        return executionRecord;
      }

      // ========================================================================
      // STEP 3: Preload organization resources (secrets + integrations)
      // ========================================================================
      await this.executeStep("preload organization resources", async () =>
        this.credentialProvider.initialize(organizationId)
      );

      executionRecord.status = getExecutionStatus(
        executionContext,
        executionState
      );
      await this.monitoringService.sendUpdate(
        workflowSessionId,
        executionRecord
      );

      // ========================================================================
      // STEP 4: Execute workflow nodes level-by-level
      // ========================================================================
      const { state: finalState, record: finalRecord } =
        await this.executeWorkflowLevels(
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

      // ========================================================================
      // STEP 5: Persist final state with credit usage
      // ========================================================================
      if (executionContext) {
        executionRecord = await this.executeStep(
          "persist final execution record",
          async () => {
            const finalStatus = isExhausted
              ? ("exhausted" as any)
              : getExecutionStatus(executionContext!, executionState);

            // Record actual usage
            if (!isExhausted) {
              const actualTotalUsage = Object.values(
                executionState.nodeUsage
              ).reduce((sum, usage) => sum + usage, 0);
              await this.creditService.recordUsage(
                organizationId,
                actualTotalUsage
              );
            }

            // Create error report if there are node errors
            const errorReport =
              Object.keys(executionState.nodeErrors).length > 0
                ? "Workflow execution failed"
                : undefined;

            // Save to execution store - this happens exactly once per execution
            return this.executionStore.save({
              id: instanceId,
              workflowId: executionContext!.workflowId,
              userId,
              organizationId,
              status: finalStatus,
              nodeExecutions: this.buildNodeExecutions(
                executionContext!.workflow,
                executionContext!,
                executionState
              ),
              error: errorReport ?? executionRecord.error,
              startedAt: executionRecord.startedAt,
              endedAt: executionRecord.endedAt,
            });
          }
        );
      }

      await this.monitoringService.sendUpdate(
        workflowSessionId,
        executionRecord
      );
    }

    return executionRecord;
  }

  // ==========================================================================
  // PRIVATE - Main execution logic
  // ==========================================================================

  /**
   * Executes workflow nodes in parallel within each execution level.
   * Nodes at the same level have no dependencies on each other and can run concurrently.
   * Each node gets its own durable step for Cloudflare Workflows compatibility.
   */
  private async executeWorkflowLevels(
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
          return this.executeStep(`run node ${nodeId}`, async () => {
            return this.executeSingleNode(
              context,
              state,
              nodeId,
              httpRequest,
              emailMessage,
              queueMessage,
              scheduledTrigger
            );
          });
        })
      );

      // Apply all results to state (nodes in same level don't affect each other)
      for (const result of results) {
        applyNodeResult(state, result);
      }

      // Update execution record with current state and send monitoring notification
      currentRecord = {
        ...currentRecord,
        status: getExecutionStatus(context, state),
        nodeExecutions: this.buildNodeExecutions(
          context.workflow,
          context,
          state
        ),
      };
      await this.monitoringService.sendUpdate(workflowSessionId, currentRecord);
    }

    return { state, record: currentRecord };
  }

  /**
   * Executes a single node, including skip detection and I/O transforms.
   * Returns a result describing what happened - no state mutation.
   */
  private async executeSingleNode(
    context: WorkflowExecutionContext,
    state: ExecutionState,
    nodeId: string,
    httpRequest?: HttpRequest,
    emailMessage?: EmailMessage,
    queueMessage?: QueueMessage,
    scheduledTrigger?: ScheduledTrigger
  ): Promise<NodeExecutionResult> {
    // ========================================================================
    // Check if node should be skipped
    // ========================================================================

    // Already skipped or errored
    if (state.skippedNodes.includes(nodeId) || nodeId in state.nodeErrors) {
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

    const node = this.findNode(context.workflow, nodeId);
    if (!node) {
      return {
        nodeId,
        status: "error",
        error: new NodeNotFoundError(nodeId).message,
      };
    }

    // Analyze upstream dependencies to determine if node should skip
    const inboundEdges = context.workflow.edges.filter(
      (edge) => edge.target === nodeId
    );

    if (inboundEdges.length > 0) {
      let unavailableCount = 0;

      for (const edge of inboundEdges) {
        // Upstream errored
        if (edge.source in state.nodeErrors) {
          unavailableCount++;
          continue;
        }
        // Upstream was skipped
        if (state.skippedNodes.includes(edge.source)) {
          unavailableCount++;
          continue;
        }
        // Upstream executed but didn't populate this specific output (conditional branch)
        if (state.executedNodes.includes(edge.source)) {
          const sourceOutputs = state.nodeOutputs[edge.source];
          if (sourceOutputs && !(edge.sourceOutput in sourceOutputs)) {
            unavailableCount++;
            continue;
          }
        }
      }

      // Skip if ALL upstream dependencies are unavailable
      if (unavailableCount === inboundEdges.length) {
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
    }

    // ========================================================================
    // Get node type and validate
    // ========================================================================

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

    // ========================================================================
    // Collect and transform inputs
    // ========================================================================

    // Collect inputs from node defaults and upstream edges
    const inputs: NodeRuntimeValues = {};

    for (const input of node.inputs) {
      if (input.value !== undefined && isRuntimeValue(input.value)) {
        inputs[input.name] = input.value;
      }
    }

    const edgesByInput = new Map<string, typeof inboundEdges>();
    for (const edge of inboundEdges) {
      const inputName = edge.targetInput;
      if (!edgesByInput.has(inputName)) {
        edgesByInput.set(inputName, []);
      }
      edgesByInput.get(inputName)!.push(edge);
    }

    for (const [inputName, edges] of edgesByInput) {
      const nodeTypeInput = getNodeType(executable)?.inputs?.find(
        (input) => input.name === inputName
      );
      const acceptsMultiple = nodeTypeInput?.repeated ?? false;

      const values: RuntimeValue[] = [];
      for (const edge of edges) {
        const sourceOutputs = state.nodeOutputs[edge.source];
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

    // Transform inputs for node execution
    const objectStore = new ObjectStore(this.env.RESSOURCES);
    const processedInputs: Record<string, any> = {};

    for (const [name, value] of Object.entries(inputs)) {
      const input = node.inputs.find((i) => i.name === name);
      const parameterType = input?.type ?? "string";

      if (Array.isArray(value)) {
        const transformedArray = await Promise.all(
          value.map((v) => apiToNodeParameter(parameterType, v, objectStore))
        );
        processedInputs[name] = transformedArray;
      } else {
        processedInputs[name] = await apiToNodeParameter(
          parameterType,
          value,
          objectStore
        );
      }
    }

    // ========================================================================
    // Execute node
    // ========================================================================

    try {
      const nodeContext = this.credentialProvider.createNodeContext(
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
        // Transform outputs for runtime storage
        const outputs = result.outputs ?? {};
        const outputsForRuntime: Record<string, RuntimeValue> = {};

        for (const [name, value] of Object.entries(outputs)) {
          const output = node.outputs.find((o) => o.name === name);
          const parameterType = output?.type ?? "string";

          if (output?.repeated && Array.isArray(value)) {
            const transformedArray = await Promise.all(
              value.map((v) =>
                nodeToApiParameter(
                  parameterType,
                  v,
                  objectStore,
                  context.organizationId,
                  context.executionId
                )
              )
            );
            outputsForRuntime[name] = transformedArray;
          } else {
            outputsForRuntime[name] = await nodeToApiParameter(
              parameterType,
              value,
              objectStore,
              context.organizationId,
              context.executionId
            );
          }
        }

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

  // ==========================================================================
  // PRIVATE - Utilities (reused or complex algorithms)
  // ==========================================================================

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
   * Finds a node in the workflow by its ID.
   */
  private findNode(workflow: Workflow, nodeId: string): Node | undefined {
    return workflow.nodes.find((n) => n.id === nodeId);
  }

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
