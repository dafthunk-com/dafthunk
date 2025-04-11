import {
  WorkflowEntrypoint,
  WorkflowEvent,
  WorkflowStep,
  WorkflowStepConfig,
} from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { Env } from "../index";
import { Workflow as RuntimeWorkflow, NodeContext } from "../lib/runtime/types";
import { validateWorkflow } from "../lib/runtime/validation";
import { NodeRegistry } from "../nodes/nodeRegistry";
import { ParameterRegistry } from "../lib/runtime/parameterRegistry";
import { BinaryDataHandler } from "../lib/runtime/binaryDataHandler";
import { ObjectStore } from "../lib/runtime/store";

type Params = {
  workflow: RuntimeWorkflow;
};

export class ExecuteWorkflow extends WorkflowEntrypoint<Env, Params> {
  private static readonly defaultConfig: WorkflowStepConfig = {
    retries: {
      limit: 0,
      delay: 10000,
      backoff: "exponential",
    },
    timeout: "10 minutes",
  };

  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    try {
      // Step 1: Validate the workflow and initialize data
      const initState = await step.do(
        "validate workflow",
        ExecuteWorkflow.defaultConfig,
        async () => this.validateWorkflow(event.payload.workflow)
      );

      // Step 2: Initialize executable nodes and create topological sort
      let state = await step.do(
        "setup execution",
        ExecuteWorkflow.defaultConfig,
        async () => this.setupExecution(initState)
      );

      for (const nodeId of state.sortedNodes) {
        // Skip nodes that already have errors (probably due to missing implementation)
        if (state.nodeErrors.has(nodeId)) {
          continue;
        }
        // Execute the node
        state = await step.do(
          `execute node ${nodeId}`,
          ExecuteWorkflow.defaultConfig,
          async () => this.executeNode(state, nodeId)
        );
      }

      return {
        workflowId: state.workflow.id,
        nodeOutputs: Object.fromEntries(state.nodeOutputs),
        executedNodes: Array.from(state.executedNodes),
        errors: Object.fromEntries(state.nodeErrors),
      };
    } catch (error) {
      console.error(error);
      return {
        workflowId: event.payload.workflow.id,
        nodeOutputs: {},
        executedNodes: [],
        errors: {
          workflow: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  private async validateWorkflow(workflow: RuntimeWorkflow) {
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

    if (result.success) {
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
  private topologicalSort(workflow: RuntimeWorkflow): string[] {
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
}
