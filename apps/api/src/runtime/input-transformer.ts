import type { JsonArray, JsonObject, ObjectReference, Workflow } from "@dafthunk/types";

import type { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import { apiToNodeParameter } from "../nodes/parameter-mapper";
import type { ObjectStore } from "../stores/object-store";
import type { NodeRuntimeValues } from "./types";

/**
 * Transforms node inputs from runtime format to node execution format.
 * Resolves ObjectReferences to binary data and handles type conversions.
 */
export class InputTransformer {
  constructor(private nodeRegistry: CloudflareNodeRegistry) {}

  /**
   * Converts runtime inputs to the representation expected by the node.
   * - Resolves ObjectReferences to binary data (Uint8Array)
   * - Handles repeated parameters (arrays)
   * - Validates required inputs
   */
  async transformInputs(
    workflow: Workflow,
    nodeIdentifier: string,
    inputValues: NodeRuntimeValues,
    objectStore: ObjectStore
  ): Promise<Record<string, unknown>> {
    const node = workflow.nodes.find((n) => n.id === nodeIdentifier);
    if (!node) throw new Error(`Node ${nodeIdentifier} not found`);

    const processed: Record<string, unknown> = {};

    for (const definition of node.inputs) {
      const { name, type, required } = definition;
      const value = inputValues[name];

      if (required && (value === undefined || value === null)) {
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
