import type { Workflow } from "@dafthunk/types";

import { nodeToApiParameter } from "../nodes/parameter-mapper";
import type { ObjectStore } from "../stores/object-store";
import type { NodeRuntimeValues } from "./types";

/**
 * Transforms node outputs from execution format to runtime format.
 * Converts binary data to ObjectReferences for storage/transmission.
 */
export class OutputTransformer {
  /**
   * Converts node outputs to a serializable runtime representation.
   * - Converts binary data (Uint8Array) to ObjectReferences
   * - Stores large objects in R2
   * - Returns JSON-serializable values
   */
  async transformOutputs(
    workflow: Workflow,
    nodeIdentifier: string,
    outputsFromNode: Record<string, unknown>,
    objectStore: ObjectStore,
    organizationId: string,
    executionId: string
  ): Promise<NodeRuntimeValues> {
    const node = workflow.nodes.find((n) => n.id === nodeIdentifier);
    if (!node) throw new Error(`Node ${nodeIdentifier} not found`);

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
}
