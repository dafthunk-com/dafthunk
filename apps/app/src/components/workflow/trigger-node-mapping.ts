import type { Node, NodeType, WorkflowTrigger } from "@dafthunk/types";
import { buildTriggerNodes } from "@dafthunk/utils";

import { createNodeId } from "./graph-ids";

export {
  ALL_TRIGGER_NODE_TYPE_IDS,
  getTriggerNodeTypes,
  TRIGGER_TO_NODE_TYPES,
} from "@dafthunk/utils";

/**
 * Builds initial `Node` objects for a given trigger type. Thin wrapper over the
 * shared helper that supplies the app's node-id scheme.
 */
export function buildInitialTriggerNodes(
  trigger: WorkflowTrigger,
  nodeTypes: NodeType[]
): Node[] {
  return buildTriggerNodes(trigger, nodeTypes, {
    idFor: (nodeType) => createNodeId(nodeType.type),
  });
}
