import {
  Workflow,
  ValidationError,
  NodeContext,
  WorkflowExecutionOptions,
  BinaryValue,
  ImageValue,
  AudioValue,
  DocumentValue,
} from "./types";
import { NodeRegistry } from "./nodeRegistry";
import { NodeType } from "../nodes/types";
import { validateWorkflow } from "./validation";
import { ExecutableNode } from "../nodes/types";
import { ParameterRegistry } from "./parameterRegistry";
import { ParameterValue as RuntimeParameterValue } from "./types";
import { ParameterValue as NodeParameterValue } from "../nodes/types";
import { ObjectStore } from "./store";

/**
 * Runtime class that handles the execution of a workflow
 *
 * Binary data handling:
 * - Binary data (audio, images, documents, raw binary) is stored in the ObjectStore
 * - References to this data are passed between nodes in the format {id: string, mimeType: string}
 * - When a node executes, the runtime loads the actual binary data for the node to process
 * - When a node outputs binary data, the runtime stores it and creates a reference for downstream nodes
 */
export class Runtime {
  private workflow: Workflow;
  private nodeOutputs: Map<string, Record<string, RuntimeParameterValue>> =
    new Map();
  private executedNodes: Set<string> = new Set();
  private nodeErrors: Map<string, string> = new Map();
  private executableNodes: Map<string, ExecutableNode> = new Map();
  private options: WorkflowExecutionOptions;
  private env?: any;
  private aborted: boolean = false;
  private typeRegistry: ParameterRegistry;
  private objectStore?: ObjectStore;

  constructor(
    workflow: Workflow,
    options: WorkflowExecutionOptions = {},
    env?: any,
    objectStore?: ObjectStore
  ) {
    this.workflow = workflow;
    this.options = options;
    this.env = env;
    this.objectStore = objectStore;
    this.typeRegistry = ParameterRegistry.getInstance();
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
  private getNodeInputs(nodeId: string): Record<string, RuntimeParameterValue> {
    const inputs: Record<string, RuntimeParameterValue> = {};
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
        const sourceOutput = sourceNodeOutputs[edge.sourceOutput];
        const targetInput = node.inputs.find(
          (input) => input.name === edge.targetInput
        );
        if (targetInput) {
          inputs[edge.targetInput] = sourceOutput;
        }
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

    // If there are no incoming edges, the node is ready
    if (incomingEdges.length === 0) {
      return true;
    }

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
   * Validates and maps inputs for a node
   * For binary types (audio, images, documents, raw binary), this loads the
   * actual binary data from the store based on the reference
   */
  private async handleNodeInputs(
    nodeId: string,
    inputs: Record<string, RuntimeParameterValue>
  ): Promise<Record<string, any>> {
    const node = this.workflow.nodes.find((n) => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const nodeType = this.executableNodes.get(nodeId)
      ?.constructor as typeof ExecutableNode;
    if (!nodeType?.nodeType) {
      throw new Error(`Node type not found for ${nodeId}`);
    }

    // Validate inputs
    const validation = this.validateInputs(nodeType.nodeType, inputs);
    if (!validation.isValid) {
      throw new Error(validation.error || "Invalid input data");
    }

    const mappedInputs: Record<string, any> = {};

    // Handle each input parameter
    for (const [key, value] of Object.entries(inputs)) {
      // Check if this is a binary type that needs to be loaded from the store
      if (
        this.objectStore &&
        (value instanceof BinaryValue ||
          value instanceof ImageValue ||
          value instanceof AudioValue ||
          value instanceof DocumentValue)
      ) {
        // Load the binary data from the store
        try {
          const objectRef = value.getValue();
          const data = await this.objectStore.read(objectRef);

          // For node types that expect raw binary data
          if (value instanceof BinaryValue) {
            mappedInputs[key] = data;
          } else {
            // For types that expect { data, mimeType } format
            mappedInputs[key] = {
              data,
              mimeType: objectRef.mimeType,
            };
          }
        } catch (error) {
          throw new Error(
            `Failed to load binary data for input ${key}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      } else {
        // For non-binary types, just get the value
        mappedInputs[key] = value.getValue();
      }
    }

    return mappedInputs;
  }

  /**
   * Validates and maps outputs for a node
   * For binary types (audio, images, documents, raw binary), this stores the
   * binary data in the object store and creates references
   */
  private async handleNodeOutputs(
    nodeId: string,
    outputs: Record<string, NodeParameterValue>
  ): Promise<Record<string, RuntimeParameterValue>> {
    const nodeType = this.executableNodes.get(nodeId)
      ?.constructor as typeof ExecutableNode;
    if (!nodeType?.nodeType) {
      throw new Error(`Node type not found for ${nodeId}`);
    }

    // First validate the node output values themselves are valid
    // This makes sure the node outputs match their declared types
    for (const [key, value] of Object.entries(outputs)) {
      // Validate the node parameter type
      const nodeValidation = value.validate();
      if (!nodeValidation.isValid) {
        throw new Error(`Invalid output for ${key}: ${nodeValidation.error}`);
      }

      // Check the output is defined in the node type
      const outputDef = nodeType.nodeType.outputs.find(
        (output) => output.name === key
      );
      if (!outputDef) {
        throw new Error(`Unknown output parameter: ${key}`);
      }
    }

    // Convert node outputs to runtime outputs
    const mappedOutputs: Record<string, RuntimeParameterValue> = {};

    for (const [key, value] of Object.entries(outputs)) {
      const outputDef = nodeType.nodeType.outputs.find(
        (output) => output.name === key
      );
      if (!outputDef) {
        throw new Error(`Unknown output parameter: ${key}`);
      }

      const RuntimeType = this.typeRegistry.get(outputDef.type);
      if (!RuntimeType) {
        throw new Error(`Unknown output type: ${outputDef.type}`);
      }

      // For binary types, store the data and create a reference
      if (
        this.objectStore &&
        (RuntimeType === BinaryValue ||
          RuntimeType === ImageValue ||
          RuntimeType === AudioValue ||
          RuntimeType === DocumentValue)
      ) {
        try {
          const nodeValue = value.getValue();

          // Handle different formats based on the type
          let data: Uint8Array;
          let mimeType: string;

          if (nodeValue instanceof Uint8Array) {
            // Direct binary data (BinaryValue)
            data = nodeValue;
            mimeType = "application/octet-stream";
          } else if (
            typeof nodeValue === "object" &&
            nodeValue.data instanceof Uint8Array
          ) {
            // { data, mimeType } format (ImageValue, AudioValue, DocumentValue)
            data = nodeValue.data;
            mimeType = nodeValue.mimeType || "application/octet-stream";
          } else if (
            typeof nodeValue === "object" &&
            typeof nodeValue.id === "string" &&
            typeof nodeValue.mimeType === "string"
          ) {
            // Already a reference - just use it directly
            mappedOutputs[key] = new RuntimeType(nodeValue);
            continue;
          } else {
            console.error("Invalid binary data format:", nodeValue);
            throw new Error(`Invalid binary data format for output ${key}`);
          }

          // Store the data and get a reference
          const reference = await this.objectStore.write(data, mimeType);
          mappedOutputs[key] = new RuntimeType(reference);
        } catch (error) {
          console.error("Binary data handling error:", error, {
            nodeId,
            outputKey: key,
            valueType: typeof value.getValue(),
            value: value.getValue(),
          });
          throw new Error(
            `Failed to store binary data for output ${key}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      } else {
        // For non-binary types, just use the value
        mappedOutputs[key] = new RuntimeType(value.getValue());
      }
    }

    // Now validate the runtime parameter types
    // This ensures the output values match the runtime's expected format
    for (const [key, value] of Object.entries(mappedOutputs)) {
      const runtimeValidation = value.validate();
      if (!runtimeValidation.isValid) {
        throw new Error(
          `Invalid runtime output for ${key}: ${runtimeValidation.error}`
        );
      }
    }

    return mappedOutputs;
  }

  /**
   * Validates inputs against their defined types
   */
  private validateInputs(
    nodeType: NodeType,
    inputs: Record<string, RuntimeParameterValue>
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
      // Validate the runtime parameter type
      const runtimeValidation = value.validate();
      if (!runtimeValidation.isValid) {
        return {
          isValid: false,
          error: `Invalid input for ${key}: ${runtimeValidation.error}`,
        };
      }

      const inputDef = nodeType.inputs.find((input) => input.name === key);
      if (!inputDef) {
        return { isValid: false, error: `Unknown input parameter: ${key}` };
      }

      const RuntimeParameter = this.typeRegistry.get(inputDef.type);
      if (!RuntimeParameter) {
        return {
          isValid: false,
          error: `Unknown parameter type: ${inputDef.type}`,
        };
      }
    }
    return { isValid: true };
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

      // Handle input validation and mapping
      const inputs = await this.handleNodeInputs(nodeId, rawInputs);

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
        const outputs = await this.handleNodeOutputs(
          nodeId,
          result.outputs || {}
        );

        // Store the outputs for use by downstream nodes
        this.nodeOutputs.set(nodeId, outputs);
        this.executedNodes.add(nodeId);

        // Notify node complete
        if (this.options.onNodeComplete) {
          this.options.onNodeComplete(nodeId, this.getApiNodeOutputs(outputs));
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
        return this.getApiOutputs();
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

      return this.getApiOutputs();
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
      outputs: this.getApiOutputs(),
      aborted: this.aborted,
    };
  }

  /**
   * Gets all node outputs in a format safe for API consumers
   * For binary types, ensures only object references are returned, never raw binary data
   */
  private getApiOutputs(): Map<string, Record<string, any>> {
    const outputs = new Map<string, Record<string, any>>();
    for (const [nodeId, nodeOutputs] of this.nodeOutputs.entries()) {
      outputs.set(nodeId, this.getApiNodeOutputs(nodeOutputs));
    }
    return outputs;
  }

  /**
   * Gets a node's outputs in a format safe for API consumers
   * For binary types, ensures only object references are returned, never raw binary data
   */
  private getApiNodeOutputs(
    output: Record<string, RuntimeParameterValue>
  ): Record<string, any> {
    const apiOutputs: Record<string, any> = {};
    for (const [key, value] of Object.entries(output)) {
      const rawValue = value.getValue();

      // Ensure binary types are always returned as object references
      if (
        value instanceof BinaryValue ||
        value instanceof ImageValue ||
        value instanceof AudioValue ||
        value instanceof DocumentValue
      ) {
        // Check if this is already a reference object
        if (
          typeof rawValue === "object" &&
          typeof rawValue.id === "string" &&
          typeof rawValue.mimeType === "string"
        ) {
          // It's already a reference, use it directly
          apiOutputs[key] = {
            id: rawValue.id,
            mimeType: rawValue.mimeType,
          };
        } else if (
          typeof rawValue === "object" &&
          rawValue.data instanceof Uint8Array
        ) {
          // This should never happen - we should have converted to a reference already
          // But if it does, log a warning and return a placeholder
          console.error(
            `Unexpected binary data found in ${key} when preparing API output. Binary data should have been converted to a reference.`
          );
          apiOutputs[key] = {
            id: "error-missing-reference",
            mimeType: rawValue.mimeType || "application/octet-stream",
          };
        } else {
          // Unhandled case - this should never happen
          console.error(`Unhandled binary value type for ${key}:`, rawValue);
          apiOutputs[key] = null;
        }
      } else {
        // For non-binary types, return the value directly
        apiOutputs[key] = rawValue;
      }
    }
    return apiOutputs;
  }
}
