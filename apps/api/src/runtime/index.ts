import {
  WorkflowEntrypoint,
  WorkflowEvent,
  WorkflowStep,
  WorkflowStepConfig,
} from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { Env } from "../index";
import {
  Workflow,
  WorkflowExecution,
  NodeExecutionStatus,
  WorkflowExecutionStatus,
} from "@dafthunk/types";
import { validateWorkflow } from "./validation";
import { NodeRegistry } from "../nodes/nodeRegistry";
import { NodeContext } from "../nodes/types";
import { ParameterRegistry } from "./parameterRegistry";
import { BinaryDataHandler } from "./binaryDataHandler";
import { ObjectStore } from "./store";
import { createDatabase } from "../../db";
import { executions } from "../../db/schema";

export type RuntimeParams = {
  workflow: Workflow;
  userId: string;
  monitorProgress?: boolean;
};

export type RuntimeState = {
  workflow: Workflow;
  nodeOutputs: Map<string, Record<string, any>>;
  executedNodes: Set<string>;
  nodeErrors: Map<string, string>;
  sortedNodes: string[];
  status: WorkflowExecutionStatus;
};

/**
 * Executes a `Workflow` instance from start to finish.
 */
export class Runtime extends WorkflowEntrypoint<Env, RuntimeParams> {
  
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

  /**
   * The main entrypoint called by the Workflows engine.
   */
  async run(event: WorkflowEvent<RuntimeParams>, step: WorkflowStep) {
    const { workflow, userId, monitorProgress = false } = event.payload;
    const instanceId = event.instanceId;

    // Initialise state and execution records.
    let runtimeState: RuntimeState = {
      workflow,
      nodeOutputs: new Map(),
      executedNodes: new Set(),
      nodeErrors: new Map(),
      sortedNodes: [],
      status: "idle",
    };

    let executionRecord: WorkflowExecution = {
      id: instanceId,
      workflowId: workflow.id,
      status: "idle",
      nodeExecutions: [],
    } as WorkflowExecution;

    try {
      // Prepare workflow (validation + ordering).
      runtimeState = await step.do(
        "initialise workflow",
        Runtime.defaultStepConfig,
        async () => this.initialiseWorkflow(workflow)
      );

      // Save state before node execution begins if monitoring is enabled
      if (monitorProgress) {
        executionRecord = await step.do(
          "persist initial execution record",
          Runtime.defaultStepConfig,
          async () =>
            this.saveExecutionState(
              userId,
              workflow.id,
              instanceId,
              runtimeState
            )
        );
      }

      // Execute nodes sequentially.
      for (const nodeIdentifier of runtimeState.sortedNodes) {
        if (runtimeState.nodeErrors.has(nodeIdentifier)) {
          continue; // Skip nodes that were already marked as failed.
        }

        runtimeState = await step.do(
          `run node ${nodeIdentifier}`,
          Runtime.defaultStepConfig,
          async () => this.executeNode(runtimeState, nodeIdentifier)
        );

        // Persist progress after each node if monitoring is enabled
        if (monitorProgress) {
          executionRecord = await step.do(
            `persist after ${nodeIdentifier}`,
            Runtime.defaultStepConfig,
            async () =>
              this.saveExecutionState(
                userId,
                workflow.id,
                instanceId,
                runtimeState
              )
          );
        }
      }
    } catch (error) {
      // Capture unexpected failure.
      runtimeState = { ...runtimeState, status: "error" };
      executionRecord = {
        ...executionRecord,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      // Always persist the final state
      executionRecord = await step.do(
        "persist final execution record",
        Runtime.defaultStepConfig,
        async () =>
          this.saveExecutionState(userId, workflow.id, instanceId, runtimeState)
      );

      return executionRecord;
    }
  }

  /**
   * Validates the workflow and creates a sequential execution order.
   */
  private async initialiseWorkflow(workflow: Workflow): Promise<RuntimeState> {
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

    return {
      workflow,
      nodeOutputs: new Map(),
      executedNodes: new Set(),
      nodeErrors: new Map(),
      sortedNodes: orderedNodes,
      status: "executing",
    };
  }

  /**
   * Executes a single node and stores its outputs.
   */
  private async executeNode(
    runtimeState: RuntimeState,
    nodeIdentifier: string
  ): Promise<RuntimeState> {
    const node = runtimeState.workflow.nodes.find(
      (n) => n.id === nodeIdentifier
    );
    if (!node) {
      runtimeState.nodeErrors.set(
        nodeIdentifier,
        `Node not found: ${nodeIdentifier}`
      );
      return { ...runtimeState, status: "error" };
    }

    // Resolve the runnable implementation.
    const executable = NodeRegistry.getInstance().createExecutableNode(node);
    if (!executable) {
      runtimeState.nodeErrors.set(
        nodeIdentifier,
        `Node type not implemented: ${node.type}`
      );
      return { ...runtimeState, status: "error" };
    }

    // Gather inputs by reading connections and default values.
    const inputValues = this.collectNodeInputs(runtimeState, nodeIdentifier);

    try {
      const processedInputs = await this.mapRuntimeToNodeInputs(
        runtimeState,
        nodeIdentifier,
        inputValues
      );

      const context: NodeContext = {
        nodeId: nodeIdentifier,
        workflowId: runtimeState.workflow.id,
        inputs: processedInputs,
        // No progress feedback in this implementation.
        onProgress: () => {},
        env: {
          AI: this.env.AI,
        },
      };

      const result = await executable.execute(context);

      if (result.status === "completed") {
        const outputsForRuntime = await this.mapNodeToRuntimeOutputs(
          runtimeState,
          nodeIdentifier,
          result.outputs ?? {}
        );

        runtimeState.nodeOutputs.set(nodeIdentifier, outputsForRuntime);
        runtimeState.executedNodes.add(nodeIdentifier);
      } else {
        const failureMessage = result.error ?? "Unknown error";
        runtimeState.nodeErrors.set(nodeIdentifier, failureMessage);
        runtimeState.status = "error";
      }

      // Determine final workflow status.
      if (runtimeState.status !== "error") {
        const allNodesVisited = runtimeState.sortedNodes.every(
          (id) =>
            runtimeState.executedNodes.has(id) ||
            runtimeState.nodeErrors.has(id)
        );
        runtimeState.status =
          allNodesVisited && runtimeState.nodeErrors.size === 0
            ? "completed"
            : "executing";
      }

      return runtimeState;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      runtimeState.nodeErrors.set(nodeIdentifier, message);
      runtimeState.status = "error";
      return runtimeState;
    }
  }

  /**
   * Returns inputs for a node by checking its default values and inbound edges.
   */
  private collectNodeInputs(
    runtimeState: RuntimeState,
    nodeIdentifier: string
  ): Record<string, unknown> {
    const inputs: Record<string, unknown> = {};
    const node = runtimeState.workflow.nodes.find(
      (n) => n.id === nodeIdentifier
    );
    if (!node) return inputs;

    // Defaults declared directly on the node.
    for (const input of node.inputs) {
      if (input.value !== undefined) {
        inputs[input.name] = input.value;
      }
    }

    // Values coming from connected nodes.
    const inboundEdges = runtimeState.workflow.edges.filter(
      (edge) => edge.target === nodeIdentifier
    );

    for (const edge of inboundEdges) {
      const sourceOutputs = runtimeState.nodeOutputs.get(edge.source);
      if (sourceOutputs && sourceOutputs[edge.sourceOutput] !== undefined) {
        inputs[edge.targetInput] = sourceOutputs[edge.sourceOutput];
      }
    }
    return inputs;
  }

  /**
   * Converts raw runtime inputs to the representation expected by the node.
   */
  private async mapRuntimeToNodeInputs(
    runtimeState: RuntimeState,
    nodeIdentifier: string,
    inputValues: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const node = runtimeState.workflow.nodes.find(
      (n) => n.id === nodeIdentifier
    );
    if (!node) throw new Error(`Node ${nodeIdentifier} not found`);

    const processed: Record<string, unknown> = {};
    const binaryHandler = new BinaryDataHandler(
      new ObjectStore(this.env.BUCKET)
    );
    const registry = ParameterRegistry.getInstance(binaryHandler);

    for (const definition of node.inputs) {
      const { name, type, required } = definition;
      const value = inputValues[name];

      if (required && value === undefined) {
        throw new Error(
          `Required input '${name}' missing for node ${nodeIdentifier}`
        );
      }
      if (value === undefined) continue;

      processed[name] = await registry.convertRuntimeToNode(type, value);
    }

    return processed;
  }

  /**
   * Converts node outputs to a serialisable runtime representation.
   */
  private async mapNodeToRuntimeOutputs(
    runtimeState: RuntimeState,
    nodeIdentifier: string,
    outputsFromNode: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const node = runtimeState.workflow.nodes.find(
      (n) => n.id === nodeIdentifier
    );
    if (!node) throw new Error(`Node ${nodeIdentifier} not found`);

    const processed: Record<string, unknown> = {};
    const binaryHandler = new BinaryDataHandler(
      new ObjectStore(this.env.BUCKET)
    );
    const registry = ParameterRegistry.getInstance(binaryHandler);

    for (const definition of node.outputs) {
      const { name, type } = definition;
      const value = outputsFromNode[name];
      if (value === undefined || value === null) continue;

      processed[name] = await registry.convertNodeToRuntime(type, value);
    }
    return processed;
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
   * Persists the workflow execution state to the database.
   */
  private async saveExecutionState(
    userId: string,
    workflowId: string,
    instanceId: string,
    runtimeState: RuntimeState
  ): Promise<WorkflowExecution> {
    // Build node execution list with explicit status for each node.
    const nodeExecutionList = runtimeState.workflow.nodes.map((node) => {
      if (runtimeState.executedNodes.has(node.id)) {
        return {
          nodeId: node.id,
          status: "completed" as NodeExecutionStatus,
          outputs: runtimeState.nodeOutputs.get(node.id),
        };
      }
      if (runtimeState.nodeErrors.has(node.id)) {
        return {
          nodeId: node.id,
          status: "error" as NodeExecutionStatus,
          error: runtimeState.nodeErrors.get(node.id),
        };
      }
      return {
        nodeId: node.id,
        status: "executing" as NodeExecutionStatus,
      };
    });

    const executionStatus = runtimeState.status;

    const executionRecord: WorkflowExecution = {
      id: instanceId,
      workflowId,
      status: executionStatus,
      nodeExecutions: nodeExecutionList,
      error:
        runtimeState.nodeErrors.size > 0
          ? Array.from(runtimeState.nodeErrors.values()).join(", ")
          : undefined,
    };

    try {
      const db = createDatabase(this.env.DB);
      const executionData = {
        status: executionStatus,
        data: JSON.stringify({ nodeExecutions: nodeExecutionList }),
        error: executionRecord.error,
        updatedAt: new Date(),
      };

      await db
        .insert(executions)
        .values({
          id: instanceId,
          workflowId,
          userId,
          createdAt: new Date(),
          ...executionData,
        })
        .onConflictDoUpdate({ target: executions.id, set: executionData });
    } catch (error) {
      console.error("Failed to persist execution record:", error);
      // Continue without interrupting the workflow.
    }

    return executionRecord;
  }
}
