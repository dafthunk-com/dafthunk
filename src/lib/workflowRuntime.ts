import {
  Workflow,
  ValidationError,
  NodeRegistry,
  ExecutableNode,
  NodeContext,
  WorkflowExecutionOptions,
} from "./workflowTypes";
import { validateWorkflow } from "./workflowValidation";
import { registerNodes } from "./nodes/nodeRegistry";

// Initialize the node registry
registerNodes();

/**
 * WorkflowRuntime class that handles the execution of a workflow
 */
export class WorkflowRuntime {
  private workflow: Workflow;
  private nodeOutputs: Map<string, Record<string, any>> = new Map();
  private executedNodes: Set<string> = new Set();
  private nodeErrors: Map<string, string> = new Map();
  private executableNodes: Map<string, ExecutableNode> = new Map();
  private options: WorkflowExecutionOptions;
  private env?: any;

  constructor(workflow: Workflow, options: WorkflowExecutionOptions = {}, env?: any) {
    this.workflow = workflow;
    this.options = options;
    this.env = env;
    this.initializeExecutableNodes();
  }

  /**
   * Initializes executable nodes from the workflow nodes
   */
  private initializeExecutableNodes(): void {
    const registry = NodeRegistry.getInstance();

    for (const node of this.workflow.nodes) {
      const executableNode = registry.createExecutableNode(node);
      if (executableNode) {
        this.executableNodes.set(node.id, executableNode);
      }
    }
  }

  /**
   * Validates the workflow before execution
   */
  async validate(): Promise<ValidationError[]> {
    const errors = validateWorkflow(this.workflow);

    // Check if all node types are registered
    for (const node of this.workflow.nodes) {
      if (!this.executableNodes.has(node.id)) {
        errors.push({
          type: "INVALID_CONNECTION",
          message: `Node type '${node.type}' is not registered`,
          details: { nodeId: node.id },
        });
      }
    }

    return errors;
  }

  /**
   * Gets the input values for a node based on its incoming connections
   */
  private getNodeInputs(nodeId: string): Record<string, any> {
    const inputs: Record<string, any> = {};
    const node = this.workflow.nodes.find((n) => n.id === nodeId);

    if (!node) return inputs;

    // Set default values for inputs
    for (const input of node.inputs) {
      if (input.value !== undefined) {
        inputs[input.name] = input.value;
      }
    }

    // Get values from connected nodes
    const incomingEdges = this.workflow.edges.filter(
      (edge) => edge.target === nodeId
    );

    for (const edge of incomingEdges) {
      const sourceNodeOutputs = this.nodeOutputs.get(edge.source);
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
   * Checks if a node is ready to execute (all dependencies have been executed)
   */
  private isNodeReady(nodeId: string): boolean {
    const incomingEdges = this.workflow.edges.filter(
      (edge) => edge.target === nodeId
    );

    // If any source node has an error, this node can't execute
    for (const edge of incomingEdges) {
      if (this.nodeErrors.has(edge.source)) {
        return false;
      }
    }

    // Check if all source nodes have been executed
    return incomingEdges.every((edge) => this.executedNodes.has(edge.source));
  }

  /**
   * Executes a single node
   */
  private async executeNode(nodeId: string): Promise<void> {
    const executableNode = this.executableNodes.get(nodeId);
    if (!executableNode) {
      const node = this.workflow.nodes.find((n) => n.id === nodeId);
      const nodeType = node ? node.type : "unknown";
      this.nodeErrors.set(nodeId, `Node type not implemented: ${nodeType}`);
      if (this.options.onNodeError) {
        this.options.onNodeError(
          nodeId,
          `Node type not implemented: ${nodeType}`
        );
      }
      return;
    }

    // Notify node start
    if (this.options.onNodeStart) {
      this.options.onNodeStart(nodeId);
    }

    try {
      // Get input values for the node
      const inputs = this.getNodeInputs(nodeId);

      // Create node context
      const context: NodeContext = {
        nodeId,
        workflowId: this.workflow.id,
        inputs,
        onProgress: (_progress) => {
          // Handle progress updates if needed
        },
        env: this.env,
      };

      // Execute the node
      const result = await executableNode.execute(context);

      if (result.success) {
        // Store the outputs for use by downstream nodes
        if (result.outputs) {
          this.nodeOutputs.set(nodeId, result.outputs);
        }
        this.executedNodes.add(nodeId);

        // Notify node complete
        if (this.options.onNodeComplete && result.outputs) {
          this.options.onNodeComplete(nodeId, result.outputs);
        }
      } else {
        // Store the error
        const errorMessage = result.error || "Unknown error";
        this.nodeErrors.set(nodeId, errorMessage);

        // Notify node error
        if (this.options.onNodeError) {
          this.options.onNodeError(nodeId, errorMessage);
        }
      }
    } catch (error) {
      // Store the error
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.nodeErrors.set(nodeId, errorMessage);

      // Notify node error
      if (this.options.onNodeError) {
        this.options.onNodeError(nodeId, errorMessage);
      }
    }
  }

  /**
   * Executes the workflow
   */
  async execute(): Promise<Map<string, Record<string, any>>> {
    try {
      // Validate the workflow
      const errors = await this.validate();
      if (errors.length > 0) {
        const errorMessage = `Workflow validation failed: ${errors.map((e) => e.message).join(", ")}`;
        if (this.options.onExecutionError) {
          this.options.onExecutionError(errorMessage);
        }
        throw new Error(errorMessage);
      }

      // Find nodes with no incoming edges (start nodes)
      const startNodes = this.workflow.nodes.filter(
        (node) => !this.workflow.edges.some((edge) => edge.target === node.id)
      );

      if (startNodes.length === 0 && this.workflow.nodes.length > 0) {
        const errorMessage = "No start nodes found in workflow";
        if (this.options.onExecutionError) {
          this.options.onExecutionError(errorMessage);
        }
        throw new Error(errorMessage);
      }

      // Execute start nodes
      for (const node of startNodes) {
        await this.executeNode(node.id);
      }

      // Continue executing nodes until all are executed or no more can be executed
      let progress = true;
      while (progress) {
        progress = false;

        for (const node of this.workflow.nodes) {
          // Skip nodes that have already been executed or have errors
          if (this.executedNodes.has(node.id) || this.nodeErrors.has(node.id)) {
            continue;
          }

          // Check if the node is ready to execute
          if (this.isNodeReady(node.id)) {
            await this.executeNode(node.id);
            progress = true;
          }
        }
      }

      // Check if all nodes were executed
      const unexecutedNodes = this.workflow.nodes.filter(
        (node) =>
          !this.executedNodes.has(node.id) && !this.nodeErrors.has(node.id)
      );

      if (unexecutedNodes.length > 0) {
        const errorMessage = `Some nodes could not be executed: ${unexecutedNodes.map((n) => n.id).join(", ")}`;
        if (this.options.onExecutionError) {
          this.options.onExecutionError(errorMessage);
        }
        throw new Error(errorMessage);
      }

      // Notify execution complete
      if (this.options.onExecutionComplete) {
        this.options.onExecutionComplete();
      }

      return this.nodeOutputs;
    } catch (error) {
      console.error("Workflow execution error:", error);

      // Notify execution error
      if (this.options.onExecutionError) {
        this.options.onExecutionError(
          error instanceof Error ? error.message : "Unknown error"
        );
      }

      throw error;
    }
  }

  /**
   * Gets the current execution state
   */
  getExecutionState(): {
    executedNodes: string[];
    errorNodes: Map<string, string>;
    outputs: Map<string, Record<string, any>>;
  } {
    return {
      executedNodes: Array.from(this.executedNodes),
      errorNodes: this.nodeErrors,
      outputs: this.nodeOutputs,
    };
  }
}
