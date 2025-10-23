import type { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import type { InputCollector } from "./input-collector";
import type { ExecutionState, WorkflowExecutionContext } from "./types";

/**
 * Handles conditional logic in workflow execution.
 * Determines which nodes should be skipped based on inactive outputs and missing inputs.
 */
export class SkipHandler {
  constructor(
    private nodeRegistry: CloudflareNodeRegistry,
    private inputCollector: InputCollector
  ) {}

  /**
   * Marks nodes connected to inactive outputs as skipped.
   * This is crucial for conditional logic where only one branch should execute.
   */
  skipInactiveOutputs(
    context: WorkflowExecutionContext,
    state: ExecutionState,
    nodeIdentifier: string,
    nodeOutputs: Record<string, unknown>
  ): ExecutionState {
    const node = context.workflow.nodes.find((n) => n.id === nodeIdentifier);
    if (!node) return state;

    // Find outputs that were NOT produced
    const inactiveOutputs = node.outputs
      .map((output) => output.name)
      .filter((outputName) => !(outputName in nodeOutputs));

    if (inactiveOutputs.length === 0) return state;

    // Find all edges from this node's inactive outputs
    const inactiveEdges = context.workflow.edges.filter(
      (edge) =>
        edge.source === nodeIdentifier &&
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

    const nodeTypeDefinition = (executable.constructor as any).nodeType;
    if (!nodeTypeDefinition) return false;

    const inputValues = this.inputCollector.collectNodeInputs(
      context.workflow,
      state.nodeOutputs,
      nodeId
    );

    // Check each required input based on the node type definition (not workflow node definition)
    for (const input of nodeTypeDefinition.inputs) {
      if (input.required && inputValues[input.name] === undefined) {
        return false; // Found a required input that's missing
      }
    }

    return true; // All required inputs are satisfied
  }
}
