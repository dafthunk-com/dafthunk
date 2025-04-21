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
} from "../types";
import { validateWorkflow } from "./validation";
import { NodeRegistry } from "../nodes/nodeRegistry";
import { NodeContext } from "../nodes/types";
import { ParameterRegistry } from "./parameterRegistry";
import { BinaryDataHandler } from "./binaryDataHandler";
import { ObjectStore } from "./store";

export type RuntimeParams = {
  workflow: Workflow;
};

export class Runtime extends WorkflowEntrypoint<Env, RuntimeParams> {
  private static readonly defaultConfig: WorkflowStepConfig = {
    retries: {
      limit: 0,
      delay: 10000,
      backoff: "exponential",
    },
    timeout: "10 minutes",
  };

  async run(event: WorkflowEvent<RuntimeParams>, step: WorkflowStep) {
    try {
      // Step 1: Validate the workflow and initialize data
      const initState = await step.do(
        "validate workflow",
        Runtime.defaultConfig,
        async () => {
          const state = await this.validateWorkflow(event.payload.workflow);
          await this.updateExecutionState(
            event.instanceId,
            event.payload.workflow.id,
            state
          );
          return state;
        }
      );

      // Step 2: Initialize executable nodes and create topological sort
      let state = await step.do(
        "setup execution",
        Runtime.defaultConfig,
        async () => {
          const state = await this.setupExecution(initState);
          await this.updateExecutionState(
            event.instanceId,
            event.payload.workflow.id,
            state
          );
          return state;
        }
      );

      for (const nodeId of state.sortedNodes) {
        // Skip nodes that already have errors (probably due to missing implementation)
        if (state.nodeErrors.has(nodeId)) {
          continue;
        }
        // Execute the node
        state = await step.do(
          `execute node ${nodeId}`,
          Runtime.defaultConfig,
          async () => {
            const newState = await this.executeNode(state, nodeId);
            await this.updateExecutionState(
              event.instanceId,
              event.payload.workflow.id,
              newState
            );
            return newState;
          }
        );
      }

      const finalExecution = await this.updateExecutionState(
        event.instanceId,
        event.payload.workflow.id,
        state
      );
      return finalExecution;
    } catch (error) {
      console.error(error);
      const errorExecution: WorkflowExecution = {
        id: event.instanceId,
        workflowId: event.payload.workflow.id,
        success: false,
        nodeExecutions: [],
        error: error instanceof Error ? error.message : String(error),
      };
      await this.env.KV.put(
        `execution:${event.instanceId}`,
        JSON.stringify(errorExecution)
      );
      return errorExecution;
    }
  }

  private async validateWorkflow(workflow: Workflow) {
    const validationErrors = validateWorkflow(workflow);
    if (validationErrors.length > 0) {
      throw new Error(
        `Workflow validation failed: ${validationErrors.map((error) => error.message).join(", ")}`
      ) as NonRetryableError;
    }

    return {
      workflow,
      nodeOutputs: new Map<string, Record<string, any>>(),
      executedNodes: new Set<string>(),
      nodeErrors: new Map<string, string>(),
      sortedNodes: [], // Initialize empty array, will be populated in setupExecution
    };
  }

  private async setupExecution(
    workflowState: Awaited<ReturnType<typeof this.validateWorkflow>>
  ) {
    // Create a topological sort of the nodes
    const sortedNodes = this.topologicalSort(workflowState.workflow);

    if (sortedNodes.length === 0 && workflowState.workflow.nodes.length > 0) {
      throw new Error(
        "Failed to create execution order. Possible circular dependency detected."
      ) as NonRetryableError;
    }

    return {
      ...workflowState,
      sortedNodes,
    };
  }

  private async executeNode(
    state: Awaited<ReturnType<typeof this.setupExecution>>,
    nodeId: string
  ) {
    const node = state.workflow.nodes.find((n) => n.id === nodeId);
    if (!node) {
      state.nodeErrors.set(nodeId, `Node not found: ${nodeId}`);
      return state;
    }
    const registry = NodeRegistry.getInstance();
    const executableNode = registry.createExecutableNode(node);
    if (!executableNode) {
      state.nodeErrors.set(nodeId, `Node type not implemented: ${node.type}`);
      return state;
    }

    // Get input values for the node
    const inputs = this.getNodeInputs(state, nodeId);

    // Handle input validation and mapping
    const processedInputs = await this.handleNodeInputs(state, nodeId, inputs);

    // Create node context
    const context: NodeContext = {
      nodeId,
      workflowId: state.workflow.id,
      inputs: processedInputs,
      onProgress: () => {}, // Not using progress in this implementation
      env: {
        AI: this.env.AI,
      },
    };

    // Execute the node
    const result = await executableNode.execute(context);

    if (result.status === "completed") {
      // Handle output validation and mapping
      const outputs = await this.handleNodeOutputs(
        state,
        nodeId,
        result.outputs || {}
      );

      // Store outputs for downstream nodes
      state.nodeOutputs.set(nodeId, outputs);
      state.executedNodes.add(nodeId);
    } else {
      // Store the error
      const errorMessage = result.error || "Unknown error";
      state.nodeErrors.set(nodeId, errorMessage);
    }

    return state;
  }

  /**
   * Creates a topological sorting of nodes (execution order)
   * Nodes with no dependencies come first, then nodes whose dependencies are satisfied
   */
  private topologicalSort(workflow: Workflow): string[] {
    const sorted: string[] = [];
    const visited: Set<string> = new Set();
    const temporary: Set<string> = new Set();

    // Create an adjacency list representation of the graph
    const graph: Map<string, string[]> = new Map();
    for (const node of workflow.nodes) {
      graph.set(node.id, []);
    }

    // Populate the graph with edges
    for (const edge of workflow.edges) {
      const neighbors = graph.get(edge.source) || [];
      if (!neighbors.includes(edge.target)) {
        neighbors.push(edge.target);
        graph.set(edge.source, neighbors);
      }
    }

    // Define a depth-first search function
    const visit = (nodeId: string): boolean => {
      // If we've permanently visited this node, skip it
      if (visited.has(nodeId)) {
        return true;
      }

      // If we're temporarily visiting this node, we found a cycle
      if (temporary.has(nodeId)) {
        return false; // Cycle detected
      }

      // Mark as temporarily visited
      temporary.add(nodeId);

      // Visit all neighbors
      const neighbors = graph.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visit(neighbor)) {
          return false; // Cycle detected in subtree
        }
      }

      // Mark as permanently visited
      temporary.delete(nodeId);
      visited.add(nodeId);

      // Add to sorted list
      sorted.unshift(nodeId);
      return true;
    };

    // Start DFS from each node not yet visited
    for (const node of workflow.nodes) {
      if (!visited.has(node.id)) {
        if (!visit(node.id)) {
          return []; // Return empty array if cycle detected
        }
      }
    }

    return sorted;
  }

  /**
   * Gets the input values for a node based on its incoming connections
   */
  private getNodeInputs(state: any, nodeId: string): Record<string, any> {
    const inputs: Record<string, any> = {};
    const node = state.workflow.nodes.find((n: any) => n.id === nodeId);

    if (!node) return inputs;

    // Set default values for inputs
    for (const input of node.inputs) {
      if (input.value !== undefined) {
        inputs[input.name] = input.value;
      }
    }

    // Get values from connected nodes
    const incomingEdges = state.workflow.edges.filter(
      (edge: any) => edge.target === nodeId
    );

    for (const edge of incomingEdges) {
      const sourceNodeOutputs = state.nodeOutputs.get(edge.source);
      if (
        sourceNodeOutputs &&
        sourceNodeOutputs[edge.sourceOutput] !== undefined
      ) {
        inputs[edge.targetInput] = sourceNodeOutputs[edge.sourceOutput];
      }
    }

    return inputs;
  }

  /**
   * Validates and maps inputs for a node
   */
  private async handleNodeInputs(
    state: Awaited<ReturnType<typeof this.setupExecution>>,
    nodeId: string,
    inputs: Record<string, any>
  ): Promise<Record<string, any>> {
    const node = state.workflow.nodes.find((n: any) => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const mappedInputs: Record<string, any> = {};

    // Process each input defined in the node type
    for (const inputDef of node.inputs) {
      const inputName = inputDef.name;
      const inputType = inputDef.type;
      const inputValue = inputs[inputName];

      // Check if required input is missing
      if (inputDef.required && inputValue === undefined) {
        throw new Error(
          `Required input '${inputName}' is missing for node ${nodeId}`
        );
      }

      // Skip undefined values
      if (inputValue === undefined) {
        continue;
      }

      try {
        // Convert the input value from runtime to node representation
        const binaryHandler = new BinaryDataHandler(
          new ObjectStore(this.env.BUCKET)
        );
        const typeRegistry = ParameterRegistry.getInstance(binaryHandler);

        mappedInputs[inputName] = await typeRegistry.convertRuntimeToNode(
          inputType,
          inputValue
        );
      } catch (error: unknown) {
        throw new Error(
          `Failed to convert input '${inputName}' for node ${nodeId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return mappedInputs;
  }

  /**
   * Validates and maps outputs for a node
   */
  private async handleNodeOutputs(
    state: Awaited<ReturnType<typeof this.setupExecution>>,
    nodeId: string,
    outputs: Record<string, any>
  ): Promise<Record<string, any>> {
    const node = state.workflow.nodes.find((n) => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const mappedOutputs: Record<string, any> = {};

    // Process each output defined in the node type
    for (const outputDef of node.outputs) {
      const outputName = outputDef.name;
      const outputType = outputDef.type;
      const outputValue = outputs[outputName];

      // Skip undefined values
      if (outputValue === undefined) {
        continue;
      }

      try {
        // Convert the output value from node to runtime representation
        const binaryHandler = new BinaryDataHandler(
          new ObjectStore(this.env.BUCKET)
        );
        const typeRegistry = ParameterRegistry.getInstance(binaryHandler);
        mappedOutputs[outputName] = await typeRegistry.convertNodeToRuntime(
          outputType,
          outputValue
        );
      } catch (error: unknown) {
        throw new Error(
          `Failed to convert output '${outputName}' for node ${nodeId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return mappedOutputs;
  }

  private async updateExecutionState(
    instanceId: string,
    workflowId: string,
    state: Awaited<ReturnType<typeof this.setupExecution>>
  ) {
    // Create a map of executed nodes for quick lookup
    const executedNodesMap = new Map(
      Array.from(state.executedNodes).map((nodeId) => [
        nodeId,
        {
          nodeId,
          status: state.nodeErrors.has(nodeId)
            ? ("error" as NodeExecutionStatus)
            : ("completed" as NodeExecutionStatus),
          error: state.nodeErrors.get(nodeId),
          outputs: state.nodeOutputs.get(nodeId),
        },
      ])
    );

    // Create a map of nodes that are in the execution queue but not yet executed
    const pendingNodesMap = new Map(
      state.sortedNodes
        .filter((nodeId) => !state.executedNodes.has(nodeId))
        .map((nodeId) => [
          nodeId,
          {
            nodeId,
            status: "executing" as NodeExecutionStatus,
            outputs: {},
          },
        ])
    );

    // Combine all nodes from the workflow
    const allNodeExecutions = state.workflow.nodes.map((node) => {
      // If the node has been executed, use its execution data
      if (executedNodesMap.has(node.id)) {
        return executedNodesMap.get(node.id)!;
      }

      // If the node is in the pending queue, mark it as pending
      if (pendingNodesMap.has(node.id)) {
        return pendingNodesMap.get(node.id)!;
      }

      // Otherwise, mark it as not started
      return {
        nodeId: node.id,
        status: "idle" as NodeExecutionStatus,
        outputs: {},
      };
    });

    const execution: WorkflowExecution = {
      id: instanceId,
      workflowId: workflowId,
      success: state.nodeErrors.size === 0,
      nodeExecutions: allNodeExecutions,
      error:
        state.nodeErrors.size > 0
          ? Array.from(state.nodeErrors.entries())
              .map(([_nodeId, error]) => error)
              .join(", ")
          : undefined,
    };

    await this.env.KV.put(`execution:${instanceId}`, JSON.stringify(execution));
    return execution;
  }
}
