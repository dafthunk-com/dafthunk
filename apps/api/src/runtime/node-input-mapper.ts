import type { JsonArray, JsonObject, ObjectReference } from "@dafthunk/types";

import type { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import { apiToNodeParameter } from "../nodes/parameter-mapper";
import type { ObjectStore } from "../stores/object-store";
import type {
  BasicNodeOutputValue,
  NodeOutputs,
  NodeOutputValue,
  RuntimeState,
} from "./runtime";

/**
 * Handles mapping and transformation of node inputs during workflow execution.
 * Collects inputs from edges and default values, and transforms them to node format.
 */
export class NodeInputMapper {
  constructor(private nodeRegistry: CloudflareNodeRegistry) {}

  /**
   * Returns inputs for a node by checking its default values and inbound edges.
   */
  collectNodeInputs(
    runtimeState: RuntimeState,
    nodeIdentifier: string
  ): NodeOutputs {
    const inputs: NodeOutputs = {};
    const node = runtimeState.workflow.nodes.find(
      (n): boolean => n.id === nodeIdentifier
    );
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
          inputs[input.name] = input.value as NodeOutputValue;
        }
      }
    }

    // Values coming from connected nodes.
    const inboundEdges = runtimeState.workflow.edges.filter(
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

      const values: BasicNodeOutputValue[] = [];

      for (const edge of edges) {
        const sourceOutputs = runtimeState.nodeOutputs.get(edge.source);
        if (sourceOutputs && sourceOutputs[edge.sourceOutput] !== undefined) {
          const value = sourceOutputs[edge.sourceOutput];
          if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean" ||
            (typeof value === "object" && value !== null)
          ) {
            values.push(value as BasicNodeOutputValue);
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

  /**
   * Converts raw runtime inputs to the representation expected by the node.
   */
  async mapRuntimeToNodeInputs(
    runtimeState: RuntimeState,
    nodeIdentifier: string,
    inputValues: Record<string, unknown>,
    objectStore: ObjectStore
  ): Promise<Record<string, unknown>> {
    const node = runtimeState.workflow.nodes.find(
      (n) => n.id === nodeIdentifier
    );
    if (!node) throw new Error(`Node ${nodeIdentifier} not found`);

    const processed: Record<string, unknown> = {};

    for (const definition of node.inputs) {
      const { name, type, required } = definition;
      const value = inputValues[name];

      if (required && value === undefined) {
        throw new Error(
          `Required input '${name}' missing for node ${nodeIdentifier}`
        );
      }
      if (value === undefined || value === null) continue;

      // Check if this parameter accepts multiple connections
      const executable = this.nodeRegistry.createExecutableNode(node);
      const nodeTypeDefinition = executable
        ? (executable.constructor as any).nodeType
        : null;
      const nodeTypeInput = nodeTypeDefinition?.inputs?.find(
        (input: any) => input.name === name
      );
      const acceptsMultiple = nodeTypeInput?.repeated || false;

      // Handle secret parameters as strings since secrets are preloaded in context
      const parameterType = type === "secret" ? "string" : type;

      if (acceptsMultiple && Array.isArray(value)) {
        // For parameters that accept multiple connections, process each value individually
        const processedArray = [];
        for (const singleValue of value) {
          const validSingleValue = singleValue as
            | string
            | number
            | boolean
            | ObjectReference
            | JsonArray
            | JsonObject;
          const processedSingleValue = await apiToNodeParameter(
            parameterType,
            validSingleValue,
            objectStore
          );
          processedArray.push(processedSingleValue);
        }
        processed[name] = processedArray;
      } else {
        // Single value processing (existing logic)
        const validValue = value as
          | string
          | number
          | boolean
          | ObjectReference
          | JsonArray
          | JsonObject;
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
}
