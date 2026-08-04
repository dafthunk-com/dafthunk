import type { Edge, Node, NodeType } from "@dafthunk/types";

import {
  nodeNotFoundMessage,
  nodeTypeNotImplementedMessage,
} from "./execution-errors";
import type { ExecutionGraph } from "./execution-graph";
import {
  analyzeUpstream,
  getNodeType,
  isRuntimeValue,
} from "./execution-state";
import type {
  ExecutionState,
  NodeExecutionResult,
  NodeRuntimeValues,
  RuntimeValue,
  WorkflowExecutionContext,
} from "./execution-types";
import type { ExecutableNode, NodeContext, NodeEnv } from "./node-types";
import { MultiStepNode } from "./node-types";
import { apiInputsToNode, nodeOutputsToApi } from "./parameter-mapper";
import type { RuntimeDependencies } from "./runtime-dependencies";

/**
 * Durable execution primitives the runtime lends to multi-step nodes.
 *
 * Naming is the caller's job: the runtime derives step names that stay stable
 * across replays, and the node only says *what* to run.
 */
export interface StepPrimitives {
  sleep(name: string, durationMs: number): Promise<void>;
  doStep<T>(name: string, fn: () => Promise<T>): Promise<T>;
}

/**
 * Runs one node.
 *
 * Everything between "the scheduler picked this node" and "here is what
 * happened" lives here: deciding whether upstream state allows the node to run
 * at all, resolving it against the registry, gathering and converting its
 * inputs, invoking it, and converting its outputs back.
 *
 * It never mutates ExecutionState. The result it returns is the complete record
 * of what happened, which is what lets the caller wrap execution in a durable
 * step and replay it faithfully.
 */
export class NodeExecutor<Env = unknown> {
  constructor(
    private readonly env: Env,
    private readonly deps: RuntimeDependencies<Env>,
    private readonly steps: StepPrimitives,
    /** Whether the host runtime can park a node on an external event. */
    private readonly asyncSupported: boolean
  ) {}

  async execute(
    context: WorkflowExecutionContext,
    graph: ExecutionGraph,
    state: ExecutionState,
    nodeId: string
  ): Promise<NodeExecutionResult> {
    const skipResult = this.checkSkipCondition(graph, state, nodeId);
    if (skipResult) return skipResult;

    const node = graph.node(nodeId);
    if (!node) {
      return { nodeId, status: "error", error: nodeNotFoundMessage(nodeId) };
    }

    const resolved = this.resolveExecutable(node);
    if ("status" in resolved) return resolved;

    const { executable, nodeType } = resolved;

    const { inputs, resolvedInputs } = await this.collectInputs(
      node,
      state,
      executable,
      graph.inboundEdges(nodeId),
      context.organizationId,
      context.inputOverrides?.[nodeId]
    );

    const result = await this.invoke(
      executable,
      nodeType,
      node,
      context,
      resolvedInputs
    );

    // Inputs ride on the result so they survive durable-step replay, the same
    // way outputs do. `invoke` never returns "skipped"; the guard narrows.
    return result.status === "skipped" ? result : { ...result, inputs };
  }

  /**
   * Decides whether upstream state forbids running this node.
   * Returns the terminal result to record, or null to proceed.
   */
  private checkSkipCondition(
    graph: ExecutionGraph,
    state: ExecutionState,
    nodeId: string
  ): NodeExecutionResult | null {
    const alreadySettled =
      state.skippedNodes.includes(nodeId) || nodeId in state.nodeErrors;

    const { shouldSkip, reason, blockedBy } = analyzeUpstream(
      graph,
      state,
      nodeId
    );

    if (alreadySettled || shouldSkip) {
      return {
        nodeId,
        status: "skipped",
        outputs: null,
        usage: 0,
        skipReason: reason,
        blockedBy: [...blockedBy],
      };
    }

    return null;
  }

  /**
   * Looks the node type up in the registry and instantiates the
   * implementation.
   *
   * There is deliberately no plan gate here. Credits are the limit: a trial
   * ends when they run out, which is a real constraint that scales with what
   * someone actually uses. Withholding whole capabilities on top of that was
   * tried and did not drive upgrades — it only made the product look smaller
   * than it is to the people still deciding.
   */
  private resolveExecutable(
    node: Node
  ): { executable: ExecutableNode; nodeType: NodeType } | NodeExecutionResult {
    let nodeType: NodeType;
    try {
      nodeType = this.deps.nodeRegistry.getNodeType(node.type);
    } catch (_error) {
      return {
        nodeId: node.id,
        status: "error",
        error: nodeTypeNotImplementedMessage(node.id, node.type),
      };
    }

    const executable = this.deps.nodeRegistry.createExecutableNode(node);
    if (!executable) {
      return {
        nodeId: node.id,
        status: "error",
        error: nodeTypeNotImplementedMessage(node.id, node.type),
      };
    }

    return { executable, nodeType };
  }

  /**
   * Gathers a node's inputs from its own defaults and its inbound edges, then
   * converts them from API format into the node-native format `execute` wants.
   *
   * Returns both forms: the API-format `inputs` are what gets persisted and
   * displayed, `resolvedInputs` are what the node actually receives.
   */
  private async collectInputs(
    node: Node,
    state: ExecutionState,
    executable: object,
    inboundEdges: readonly Edge[],
    organizationId: string,
    overrides?: Readonly<Record<string, unknown>>
  ): Promise<{
    inputs: NodeRuntimeValues;
    resolvedInputs: Record<string, unknown>;
  }> {
    const inputs: NodeRuntimeValues = {};

    // Start from the values configured on the node itself.
    for (const input of node.inputs) {
      if (input.value !== undefined && isRuntimeValue(input.value)) {
        inputs[input.name] = input.value;
      }
    }

    // Per-run overrides replace those literals. Restricted to inputs the node
    // actually declares, so a stale override cannot invent a parameter, and
    // applied before the edge loop so a connected input still wins.
    if (overrides) {
      for (const input of node.inputs) {
        const value = overrides[input.name];
        if (value !== undefined && isRuntimeValue(value)) {
          inputs[input.name] = value;
        }
      }
    }

    // Upstream edges override them, grouped so a repeated input can gather
    // several sources into one array.
    for (const [inputName, edges] of groupByTargetInput(inboundEdges)) {
      const acceptsMultiple =
        getNodeType(executable)?.inputs?.find(
          (input) => input.name === inputName
        )?.repeated ?? false;

      const values: RuntimeValue[] = [];
      for (const edge of edges) {
        const value = state.nodeOutputs[edge.source]?.[edge.sourceOutput];
        if (value === undefined) continue;

        if (acceptsMultiple && Array.isArray(value)) {
          values.push(...value.filter(isRuntimeValue));
        } else if (isRuntimeValue(value)) {
          values.push(value);
        }
      }

      if (values.length > 0) {
        // A non-repeated input fed by several edges takes the last writer.
        inputs[inputName] = acceptsMultiple
          ? values
          : values[values.length - 1];
      }
    }

    const resolvedInputs = await apiInputsToNode(
      node,
      inputs,
      this.deps.objectStore,
      { schemaService: this.deps.schemaService, organizationId }
    );

    return { inputs, resolvedInputs };
  }

  /** Calls the node and normalizes whatever it returns into a result. */
  private async invoke(
    executable: ExecutableNode,
    nodeType: NodeType,
    node: Node,
    context: WorkflowExecutionContext,
    resolvedInputs: Record<string, unknown>
  ): Promise<NodeExecutionResult> {
    try {
      const result = await executable.execute(
        this.buildNodeContext(executable, node, context, resolvedInputs)
      );

      // Node signalled async work — the scheduler will park on the event.
      if (result.status === "pending" && result.pendingEvent) {
        return {
          nodeId: node.id,
          status: "pending",
          eventType: result.pendingEvent.type,
          timeout: result.pendingEvent.timeout ?? "30 minutes",
        };
      }

      if (result.status === "completed") {
        return {
          nodeId: node.id,
          status: "completed",
          outputs: await nodeOutputsToApi(
            node,
            result.outputs ?? {},
            this.deps.objectStore,
            context.organizationId,
            context.executionId
          ),
          usage: result.usage ?? nodeType.usage ?? 1,
        };
      }

      return {
        nodeId: node.id,
        status: "error",
        error: result.error ?? "Unknown error",
        usage: result.usage,
      };
    } catch (error) {
      return {
        nodeId: node.id,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /** Assembles the context object handed to a node's `execute`. */
  private buildNodeContext(
    executable: ExecutableNode,
    node: Node,
    context: WorkflowExecutionContext,
    resolvedInputs: Record<string, unknown>
  ): NodeContext {
    const nodeContext: NodeContext = {
      nodeId: node.id,
      workflowId: context.workflowId,
      organizationId: context.organizationId,
      executionId: context.executionId,
      asyncSupported: this.asyncSupported,
      inputs: resolvedInputs,
      ...context.trigger,
      onProgress: () => {},
      toolRegistry: this.deps.toolRegistry,
      objectStore: this.deps.objectStore,
      databaseService: this.deps.databaseService,
      datasetService: this.deps.datasetService,
      queueService: this.deps.queueService,
      schemaService: this.deps.schemaService,
      mailboxService: this.deps.mailboxService,
      codeModeExecutor: this.deps.codeModeExecutor,
      sandboxExecutor: this.deps.sandboxExecutor,
      getSecret: (secretName: string) =>
        this.deps.credentialProvider.getSecret(secretName),
      getIntegration: (integrationId: string) =>
        this.deps.credentialProvider.getIntegration(integrationId),
      env: this.env as NodeEnv,
    };

    // Multi-step nodes drive their own durability. Counters make each call site
    // a distinct, replay-stable step name.
    if (executable instanceof MultiStepNode) {
      let sleepCounter = 0;
      let stepCounter = 0;
      nodeContext.sleep = (durationMs: number) =>
        this.steps.sleep(`${node.id}-sleep-${sleepCounter++}`, durationMs);
      nodeContext.doStep = <T>(fn: () => Promise<T>): Promise<T> =>
        this.steps.doStep(`${node.id}-step-${stepCounter++}`, fn);
    }

    return nodeContext;
  }
}

function groupByTargetInput(
  edges: readonly Edge[]
): ReadonlyMap<string, Edge[]> {
  const grouped = new Map<string, Edge[]>();
  for (const edge of edges) {
    const existing = grouped.get(edge.targetInput);
    if (existing) {
      existing.push(edge);
    } else {
      grouped.set(edge.targetInput, [edge]);
    }
  }
  return grouped;
}
