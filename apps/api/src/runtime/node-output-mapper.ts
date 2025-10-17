import { nodeToApiParameter } from "../nodes/parameter-mapper";
import type { ObjectStore } from "../stores/object-store";
import type { RuntimeState } from "./runtime";

/**
 * Handles transformation of node outputs to runtime format.
 * Converts node outputs to serializable representations for storage.
 */
export class NodeOutputMapper {
  /**
   * Converts node outputs to a serialisable runtime representation.
   */
  async mapNodeToRuntimeOutputs(
    runtimeState: RuntimeState,
    nodeIdentifier: string,
    outputsFromNode: Record<string, unknown>,
    objectStore: ObjectStore,
    organizationId: string,
    executionId: string
  ): Promise<Record<string, unknown>> {
    const node = runtimeState.workflow.nodes.find(
      (n) => n.id === nodeIdentifier
    );
    if (!node) throw new Error(`Node ${nodeIdentifier} not found`);

    const processed: Record<string, unknown> = {};

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
