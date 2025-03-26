import {
  Workflow,
  ValidationError,
  NodeRegistry,
  NodeContext,
  WorkflowExecutionOptions,
  NodeType,
} from "./workflowTypes";
import { validateWorkflow } from "./workflowValidation";
import { registerNodes } from "./nodeRegistry";
import { BaseExecutableNode } from "./nodes/baseNode";
import { ParameterTypeRegistry } from "./typeRegistry";

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
  private executableNodes: Map<string, BaseExecutableNode> = new Map();
  private options: WorkflowExecutionOptions;
  private env?: any;
  private aborted: boolean = false;
  private typeRegistry: ParameterTypeRegistry;

  constructor(
    workflow: Workflow,
    options: WorkflowExecutionOptions = {},
    env?: any
  ) {
    this.workflow = workflow;
    this.options = options;
    this.env = env;
    this.typeRegistry = ParameterTypeRegistry.getInstance();
    this.initializeExecutableNodes();

    // Set up abort signal listener if provided
    if (options.abortSignal) {
      options.abortSignal.addEventListener("abort", () => {
        console.log("Workflow execution aborted by client");
        this.aborted = true;
      });
    }
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
   * Validates and deserializes inputs for a node
   */
  private handleNodeInputs(
    nodeId: string,
    inputs: Record<string, any>
  ): Record<string, any> {
    const node = this.workflow.nodes.find((n) => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const nodeType = this.executableNodes.get(nodeId)
      ?.constructor as typeof BaseExecutableNode;
    if (!nodeType?.nodeType) {
      throw new Error(`Node type not found for ${nodeId}`);
    }

    // Deserialize inputs
    const deserializedInputs = this.deserializeInputs(
      nodeType.nodeType,
      inputs
    );

    // Validate inputs
    const validation = this.validateInputs(
      nodeType.nodeType,
      deserializedInputs
    );
    if (!validation.isValid) {
      throw new Error(validation.error || "Invalid input data");
    }

    return deserializedInputs;
  }

  /**
   * Validates and serializes outputs for a node
   */
  private handleNodeOutputs(
    nodeId: string,
    outputs: Record<string, any>
  ): Record<string, any> {
    const nodeType = this.executableNodes.get(nodeId)
      ?.constructor as typeof BaseExecutableNode;
    if (!nodeType?.nodeType) {
      throw new Error(`Node type not found for ${nodeId}`);
    }

    // Validate outputs
    const validation = this.validateOutputs(nodeType.nodeType, outputs);
    if (!validation.isValid) {
      throw new Error(validation.error || "Invalid output data");
    }

    // Serialize outputs
    return this.serializeOutputs(nodeType.nodeType, outputs);
  }

  /**
   * Validates inputs against their defined types
   */
  private validateInputs(
    nodeType: NodeType,
    inputs: Record<string, any>
  ): { isValid: boolean; error?: string } {
    // First check if all required parameters are provided
    for (const inputDef of nodeType.inputs) {
      if (inputDef.required && inputs[inputDef.name] === undefined) {
        return {
          isValid: false,
          error: `Required parameter ${inputDef.name} is not provided`,
        };
      }
    }

    // Then validate all provided inputs
    for (const [key, value] of Object.entries(inputs)) {
      const inputDef = nodeType.inputs.find((input) => input.name === key);
      if (!inputDef) {
        return { isValid: false, error: `Unknown input parameter: ${key}` };
      }

      const type = this.typeRegistry.get(inputDef.type);
      if (!type) {
        return {
          isValid: false,
          error: `Unknown parameter type: ${inputDef.type}`,
        };
      }

      const validation = type.validate(value);
      if (!validation.isValid) {
        return {
          isValid: false,
          error: `Invalid input for ${key}: ${validation.error}`,
        };
      }
    }
    return { isValid: true };
  }

  /**
   * Validates outputs against their defined types
   */
  private validateOutputs(
    nodeType: NodeType,
    outputs: Record<string, any>
  ): { isValid: boolean; error?: string } {
    for (const [key, value] of Object.entries(outputs)) {
      const outputDef = nodeType.outputs.find((output) => output.name === key);
      if (!outputDef) {
        return { isValid: false, error: `Unknown output parameter: ${key}` };
      }

      const type = this.typeRegistry.get(outputDef.type);
      if (!type) {
        return {
          isValid: false,
          error: `Unknown parameter type: ${outputDef.type}`,
        };
      }

      const validation = type.validate(value);
      if (!validation.isValid) {
        return {
          isValid: false,
          error: `Invalid output for ${key}: ${validation.error}`,
        };
      }
    }
    return { isValid: true };
  }

  /**
   * Serializes outputs according to their types
   */
  private serializeOutputs(
    nodeType: NodeType,
    outputs: Record<string, any>
  ): Record<string, any> {
    const serialized: Record<string, any> = {};

    for (const [key, value] of Object.entries(outputs)) {
      const outputDef = nodeType.outputs.find((output) => output.name === key);
      if (!outputDef) continue;

      const type = this.typeRegistry.get(outputDef.type);
      if (!type) continue;

      serialized[key] = type.serialize(value);
    }

    return serialized;
  }

  /**
   * Deserializes inputs according to their types
   */
  private deserializeInputs(
    nodeType: NodeType,
    inputs: Record<string, any>
  ): Record<string, any> {
    const deserialized: Record<string, any> = {};

    for (const [key, value] of Object.entries(inputs)) {
      const inputDef = nodeType.inputs.find((input) => input.name === key);
      if (!inputDef) continue;

      const type = this.typeRegistry.get(inputDef.type);
      if (!type) continue;

      deserialized[key] = type.deserialize(value);
    }

    return deserialized;
  }

  /**
   * Executes a single node
   */
  private async executeNode(nodeId: string): Promise<void> {
    // Check if execution has been aborted
    if (this.aborted) {
      console.log(`Skipping execution of node ${nodeId} due to abort`);
      return;
    }

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
      const rawInputs = this.getNodeInputs(nodeId);

      // Handle input validation and deserialization
      const inputs = this.handleNodeInputs(nodeId, rawInputs);

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

      // Check if execution has been aborted after node execution
      if (this.aborted) {
        console.log(`Execution aborted after node ${nodeId} execution`);
        return;
      }

      if (result.success) {
        // Handle output validation and serialization
        const outputs = this.handleNodeOutputs(nodeId, result.outputs || {});

        // Store the outputs for use by downstream nodes
        this.nodeOutputs.set(nodeId, outputs);
        this.executedNodes.add(nodeId);

        // Notify node complete
        if (this.options.onNodeComplete) {
          this.options.onNodeComplete(nodeId, outputs);
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
      // Check if execution has been aborted before we start
      if (this.aborted) {
        console.log("Execution aborted before starting");
        throw new Error("Execution aborted");
      }

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
        if (this.aborted) break;
        await this.executeNode(node.id);
      }

      // Continue executing nodes until all are executed or no more can be executed
      let progress = true;
      while (progress && !this.aborted) {
        progress = false;

        for (const node of this.workflow.nodes) {
          // Check for abort after each node
          if (this.aborted) break;

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

      // If execution was aborted, exit early
      if (this.aborted) {
        console.log("Workflow execution was aborted");
        return this.nodeOutputs;
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
      // Don't log aborted executions as errors
      if (!this.aborted) {
        console.error("Workflow execution error:", error);
      }

      // Notify execution error if not aborted
      if (this.options.onExecutionError && !this.aborted) {
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
    aborted: boolean;
  } {
    return {
      executedNodes: Array.from(this.executedNodes),
      errorNodes: this.nodeErrors,
      outputs: this.nodeOutputs,
      aborted: this.aborted,
    };
  }
}
