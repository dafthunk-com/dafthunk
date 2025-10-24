import type { Workflow } from "@dafthunk/types";

import type { Bindings } from "../context";
import type { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import type { HttpRequest } from "../nodes/types";
import type { EmailMessage } from "../nodes/types";
import { apiToNodeParameter, nodeToApiParameter } from "../nodes/parameter-mapper";
import { ObjectStore } from "../stores/object-store";
import type { ErrorHandler } from "./error-handler";
import type { ResourceProvider } from "./resource-provider";
import { getNodeType, isRuntimeValue, NodeNotFoundError, NodeTypeNotImplementedError } from "./types";
import type {
  ExecutionState,
  NodeRuntimeValues,
  RuntimeValue,
  WorkflowExecutionContext,
} from "./types";

/**
 * Unified execution engine for workflow nodes.
 * Deep module that hides complexity of input/output transformation, resource resolution, and node execution.
 *
 * Combines responsibilities of:
 * - NodeExecutor: executing individual nodes
 * - InputCollector: gathering inputs from workflow graph
 * - SkipHandler: managing conditional execution
 * - InputTransformer: converting runtime values to node parameters
 * - OutputTransformer: converting node outputs to runtime values
 */
export class ExecutionEngine {
  constructor(
    private env: Bindings,
    private nodeRegistry: CloudflareNodeRegistry,
    private resourceProvider: ResourceProvider,
    private errorHandler: ErrorHandler
  ) {}

  /**
   * Executes a single node and stores its outputs.
   * Simple interface that hides all internal complexity.
   */
  async executeNode(
    context: WorkflowExecutionContext,
    state: ExecutionState,
    nodeId: string,
    httpRequest?: HttpRequest,
    emailMessage?: EmailMessage
  ): Promise<ExecutionState> {
    const node = context.workflow.nodes.find(
      (n): boolean => n.id === nodeId
    );
    if (!node) {
      const error = new NodeNotFoundError(nodeId);
      state = this.errorHandler.recordNodeError(state, nodeId, error);
      this.errorHandler.logStatusTransition(context, state);
      return state;
    }

    const nodeType = this.nodeRegistry.getNodeType(node.type);
    this.env.COMPUTE.writeDataPoint({
      indexes: [context.organizationId],
      blobs: [context.organizationId, context.workflowId, node.id],
      doubles: [nodeType.computeCost ?? 1],
    });

    // Resolve the runnable implementation
    const executable = this.nodeRegistry.createExecutableNode(node);
    if (!executable) {
      const error = new NodeTypeNotImplementedError(nodeId, node.type);
      state = this.errorHandler.recordNodeError(state, nodeId, error);
      this.errorHandler.logStatusTransition(context, state);
      return state;
    }

    // Collect and transform inputs (internal complexity hidden)
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
        objectStore
      );

      // Create node context via resource provider (unified access to secrets/integrations)
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
        state.nodeOutputs.set(
          nodeId,
          outputsForRuntime as NodeRuntimeValues
        );
        state.executedNodes.add(nodeId);

        // After successful execution, mark nodes connected to inactive outputs as skipped
        state = this.skipInactiveOutputs(
          context,
          state,
          nodeId,
          result.outputs ?? {}
        );
      } else {
        // Node returned status="failed" - store error and continue execution
        const failureMessage = result.error ?? "Unknown error";
        state = this.errorHandler.recordNodeError(
          state,
          nodeId,
          failureMessage
        );
      }

      // Log status transition based on current state
      this.errorHandler.logStatusTransition(context, state);

      return state;
    } catch (error) {
      // Record the error
      state = this.errorHandler.recordNodeError(
        state,
        nodeId,
        error instanceof Error ? error : new Error(String(error))
      );

      // Log status transition
      this.errorHandler.logStatusTransition(context, state);

      return state;
    }
  }


  /**
   * Transforms runtime inputs to node execution format.
   * Internal method - hidden from Runtime.
   */
  private async transformInputs(
    workflow: Workflow,
    nodeId: string,
    inputValues: NodeRuntimeValues,
    objectStore: ObjectStore
  ): Promise<Record<string, unknown>> {
    const node = workflow.nodes.find((n) => n.id === nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);

    const processed: Record<string, unknown> = {};

    for (const definition of node.inputs) {
      const { name, type, required } = definition;
      const value = inputValues[name];

      if (required && (value === undefined || value === null)) {
        throw new Error(
          `Required input '${name}' missing for node ${nodeId}`
        );
      }
      if (value === undefined || value === null) continue;

      // Check if this parameter accepts multiple connections
      const executable = this.nodeRegistry.createExecutableNode(node);
      const nodeType = getNodeType(executable);
      const nodeTypeInput = nodeType?.inputs?.find(
        (input) => input.name === name
      );
      const acceptsMultiple = nodeTypeInput?.repeated ?? false;

      // Handle secret parameters as strings since secrets are preloaded in context
      const parameterType = type === "secret" ? "string" : type;

      if (acceptsMultiple && Array.isArray(value)) {
        // For parameters that accept multiple connections, process each value individually
        const processedArray = [];
        for (const singleValue of value) {
          const validSingleValue = singleValue as RuntimeValue;
          const processedSingleValue = await apiToNodeParameter(
            parameterType,
            validSingleValue,
            objectStore
          );
          processedArray.push(processedSingleValue);
        }
        processed[name] = processedArray;
      } else {
        // Single value processing
        const validValue = value as RuntimeValue;
        const processedValue = await apiToNodeParameter(
          parameterType,
          validValue,
          objectStore
        );
        processed[name] = processedValue;
      }
    }

    return processed;
  }

  /**
   * Transforms node outputs to runtime format.
   * Internal method - hidden from Runtime.
   */
  private async transformOutputs(
    workflow: Workflow,
    nodeId: string,
    outputsFromNode: Record<string, unknown>,
    objectStore: ObjectStore,
    organizationId: string,
    executionId: string
  ): Promise<NodeRuntimeValues> {
    const node = workflow.nodes.find((n) => n.id === nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);

    const processed: NodeRuntimeValues = {};

    for (const definition of node.outputs) {
      const { name, type } = definition;
      const value = outputsFromNode[name];
      if (value === undefined || value === null) continue;

      // Handle secret parameters as strings since secrets are preloaded in context
      const parameterType = type === "secret" ? "string" : type;

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

  // ==========================================================================
  // INPUT COLLECTION (Private methods)
  // ==========================================================================

  /**
   * Collects inputs for a node by checking its default values and inbound edges.
   */
  private collectNodeInputs(
    workflow: Workflow,
    nodeOutputs: Map<string, NodeRuntimeValues>,
    nodeId: string
  ): NodeRuntimeValues {
    const inputs: NodeRuntimeValues = {};
    const node = workflow.nodes.find((n): boolean => n.id === nodeId);
    if (!node) return inputs;

    // Defaults declared directly on the node
    for (const input of node.inputs) {
      if (input.value !== undefined && isRuntimeValue(input.value)) {
        inputs[input.name] = input.value;
      }
    }

    // Values coming from connected nodes
    const inboundEdges = workflow.edges.filter(
      (edge): boolean => edge.target === nodeId
    );

    // Group edges by target input to handle multiple connections
    const edgesByInput = new Map<string, typeof inboundEdges>();
    for (const edge of inboundEdges) {
      const inputName = edge.targetInput;
      if (!edgesByInput.has(inputName)) {
        edgesByInput.set(inputName, []);
      }
      edgesByInput.get(inputName)!.push(edge);
    }

    // Process each input's connections
    for (const [inputName, edges] of edgesByInput) {
      // Get the node type definition to check repeated
      const executable = this.nodeRegistry.createExecutableNode(node);
      const nodeType = getNodeType(executable);
      const nodeTypeInput = nodeType?.inputs?.find(
        (input) => input.name === inputName
      );

      // Check repeated from node type definition (not workflow node)
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
        if (acceptsMultiple) {
          // For parameters that accept multiple connections, provide an array
          inputs[inputName] = values;
        } else {
          // For single connection parameters, use the last value (current behavior)
          inputs[inputName] = values[values.length - 1];
        }
      }
    }

    return inputs;
  }

  // ==========================================================================
  // SKIP HANDLER (Private methods)
  // ==========================================================================

  /**
   * Marks nodes connected to inactive outputs as skipped.
   * This is crucial for conditional logic where only one branch should execute.
   */
  private skipInactiveOutputs(
    context: WorkflowExecutionContext,
    state: ExecutionState,
    nodeId: string,
    nodeOutputs: Record<string, unknown>
  ): ExecutionState {
    const node = context.workflow.nodes.find((n) => n.id === nodeId);
    if (!node) return state;

    // Find outputs that were NOT produced
    const inactiveOutputs = node.outputs
      .map((output) => output.name)
      .filter((outputName) => !(outputName in nodeOutputs));

    if (inactiveOutputs.length === 0) return state;

    // Find all edges from this node's inactive outputs
    const inactiveEdges = context.workflow.edges.filter(
      (edge) =>
        edge.source === nodeId &&
        inactiveOutputs.includes(edge.sourceOutput)
    );

    // Process each target node of inactive edges
    for (const edge of inactiveEdges) {
      this.skipIfMissingInputs(context, state, edge.target);
    }

    return state;
  }

  /**
   * Marks a node as skipped if it cannot execute due to missing required inputs.
   * This is smarter than recursively skipping all dependents.
   */
  private skipIfMissingInputs(
    context: WorkflowExecutionContext,
    state: ExecutionState,
    nodeId: string
  ): void {
    if (state.skippedNodes.has(nodeId) || state.executedNodes.has(nodeId)) {
      return; // Already processed
    }

    const node = context.workflow.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Check if this node has all required inputs satisfied
    const allRequiredInputsSatisfied = this.hasAllRequiredInputs(
      context,
      state,
      nodeId
    );

    // Only skip if the node cannot execute (missing required inputs)
    if (!allRequiredInputsSatisfied) {
      state.skippedNodes.add(nodeId);

      // Recursively check dependents of this skipped node
      const outgoingEdges = context.workflow.edges.filter(
        (edge) => edge.source === nodeId
      );

      for (const edge of outgoingEdges) {
        this.skipIfMissingInputs(context, state, edge.target);
      }
    }
  }

  /**
   * Checks if a node has all required inputs satisfied.
   * A node can execute if all its required inputs are available.
   */
  private hasAllRequiredInputs(
    context: WorkflowExecutionContext,
    state: ExecutionState,
    nodeId: string
  ): boolean {
    const node = context.workflow.nodes.find((n) => n.id === nodeId);
    if (!node) return false;

    // Get the node type definition to check for required inputs
    const executable = this.nodeRegistry.createExecutableNode(node);
    if (!executable) return false;

    const nodeType = getNodeType(executable);
    if (!nodeType) return false;

    const inputValues = this.collectNodeInputs(
      context.workflow,
      state.nodeOutputs,
      nodeId
    );

    // Check each required input based on the node type definition (not workflow node definition)
    for (const input of nodeType.inputs) {
      if (input.required && inputValues[input.name] === undefined) {
        return false; // Found a required input that's missing
      }
    }

    return true; // All required inputs are satisfied
  }
}
