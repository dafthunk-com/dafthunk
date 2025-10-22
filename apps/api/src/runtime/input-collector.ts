import type { Workflow } from "@dafthunk/types";

import type { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import type { NodeRuntimeValues, RuntimeValue } from "./types";

/**
 * Collects input values for nodes from the workflow graph.
 * Gathers values from default parameters and incoming edges.
 */
export class InputCollector {
  constructor(private nodeRegistry: CloudflareNodeRegistry) {}

  /**
   * Collects inputs for a node by checking its default values and inbound edges.
   * Returns values in runtime format (JSON-serializable + ObjectReferences).
   */
  collectNodeInputs(
    workflow: Workflow,
    nodeOutputs: Map<string, NodeRuntimeValues>,
    nodeIdentifier: string
  ): NodeRuntimeValues {
    const inputs: NodeRuntimeValues = {};
    const node = workflow.nodes.find((n): boolean => n.id === nodeIdentifier);
    if (!node) return inputs;

    // Defaults declared directly on the node.
    for (const input of node.inputs) {
      if (input.value !== undefined) {
        if (
          typeof input.value === "string" ||
          typeof input.value === "number" ||
          typeof input.value === "boolean" ||
          (typeof input.value === "object" && input.value !== null)
        ) {
          inputs[input.name] = input.value as RuntimeValue;
        }
      }
    }

    // Values coming from connected nodes.
    const inboundEdges = workflow.edges.filter(
      (edge): boolean => edge.target === nodeIdentifier
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
      const nodeTypeDefinition = executable
        ? (executable.constructor as any).nodeType
        : null;
      const nodeTypeInput = nodeTypeDefinition?.inputs?.find(
        (input: any) => input.name === inputName
      );

      // Check repeated from node type definition (not workflow node)
      const acceptsMultiple = nodeTypeInput?.repeated || false;

      const values: RuntimeValue[] = [];

      for (const edge of edges) {
        const sourceOutputs = nodeOutputs.get(edge.source);
        if (sourceOutputs && sourceOutputs[edge.sourceOutput] !== undefined) {
          const value = sourceOutputs[edge.sourceOutput];
          if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean" ||
            (typeof value === "object" && value !== null)
          ) {
            values.push(value as RuntimeValue);
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
}
