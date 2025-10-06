import type { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import type { NodeInputMapper } from "./node-input-mapper";
import type { RuntimeState } from "./runtime";

/**
 * Handles conditional logic in workflow execution.
 * Determines which nodes should be skipped based on inactive outputs and missing inputs.
 */
export class ConditionalExecutionHandler {
  constructor(
    private nodeRegistry: CloudflareNodeRegistry,
    private inputMapper: NodeInputMapper
  ) {}

  /**
   * Marks nodes connected to inactive outputs as skipped.
   * This is crucial for conditional logic where only one branch should execute.
   */
  markInactiveOutputNodesAsSkipped(
    runtimeState: RuntimeState,
    nodeIdentifier: string,
    nodeOutputs: Record<string, unknown>
  ): RuntimeState {
    const node = runtimeState.workflow.nodes.find(
      (n) => n.id === nodeIdentifier
    );
    if (!node) return runtimeState;

    // Find outputs that were NOT produced
    const inactiveOutputs = node.outputs
      .map((output) => output.name)
      .filter((outputName) => !(outputName in nodeOutputs));

    if (inactiveOutputs.length === 0) return runtimeState;

    // Find all edges from this node's inactive outputs
    const inactiveEdges = runtimeState.workflow.edges.filter(
      (edge) =>
        edge.source === nodeIdentifier &&
        inactiveOutputs.includes(edge.sourceOutput)
    );

    // Process each target node of inactive edges
    for (const edge of inactiveEdges) {
      this.markNodeAsSkippedIfNoValidInputs(runtimeState, edge.target);
    }

    return runtimeState;
  }

  /**
   * Marks a node as skipped if it cannot execute due to missing required inputs.
   * This is smarter than recursively skipping all dependents.
   */
  private markNodeAsSkippedIfNoValidInputs(
    runtimeState: RuntimeState,
    nodeId: string
  ): void {
    if (
      runtimeState.skippedNodes.has(nodeId) ||
      runtimeState.executedNodes.has(nodeId)
    ) {
      return; // Already processed
    }

    const node = runtimeState.workflow.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Check if this node has all required inputs satisfied
    const allRequiredInputsSatisfied = this.nodeHasAllRequiredInputsSatisfied(
      runtimeState,
      nodeId
    );

    // Only skip if the node cannot execute (missing required inputs)
    if (!allRequiredInputsSatisfied) {
      runtimeState.skippedNodes.add(nodeId);

      // Recursively check dependents of this skipped node
      const outgoingEdges = runtimeState.workflow.edges.filter(
        (edge) => edge.source === nodeId
      );

      for (const edge of outgoingEdges) {
        this.markNodeAsSkippedIfNoValidInputs(runtimeState, edge.target);
      }
    }
  }

  /**
   * Checks if a node has all required inputs satisfied.
   * A node can execute if all its required inputs are available.
   */
  private nodeHasAllRequiredInputsSatisfied(
    runtimeState: RuntimeState,
    nodeId: string
  ): boolean {
    const node = runtimeState.workflow.nodes.find((n) => n.id === nodeId);
    if (!node) return false;

    // Get the node type definition to check for required inputs
    const executable = this.nodeRegistry.createExecutableNode(node);
    if (!executable) return false;

    const nodeTypeDefinition = (executable.constructor as any).nodeType;
    if (!nodeTypeDefinition) return false;

    const inputValues = this.inputMapper.collectNodeInputs(
      runtimeState,
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
