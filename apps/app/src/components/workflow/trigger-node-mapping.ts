import type { Node, NodeType, WorkflowTrigger } from "@dafthunk/types";

/**
 * Maps workflow trigger types to the node type(s) that should be auto-added.
 * `manual` has no trigger nodes.
 */
const TRIGGER_TO_NODE_TYPES: Record<WorkflowTrigger, string[]> = {
  manual: [],
  scheduled: ["receive-scheduled-trigger"],
  http_webhook: ["http-webhook"],
  http_request: ["http-request", "http-response"],
  email_message: ["receive-email"],
  queue_message: ["queue-message"],
  discord_event: ["receive-discord-message"],
  telegram_event: ["receive-telegram-message"],
  whatsapp_event: ["receive-whatsapp-message"],
  slack_event: ["receive-slack-message"],
};

/** All node type IDs that are trigger nodes. */
export const ALL_TRIGGER_NODE_TYPE_IDS = new Set(
  Object.values(TRIGGER_TO_NODE_TYPES).flat()
);

/** Returns the node type IDs to add for a given trigger type. */
export function getTriggerNodeTypes(trigger: WorkflowTrigger): string[] {
  return TRIGGER_TO_NODE_TYPES[trigger] ?? [];
}

/**
 * Builds initial `Node` objects for a given trigger type, using `NodeType`
 * definitions for inputs/outputs. Used when creating workflows.
 */
export function buildInitialTriggerNodes(
  trigger: WorkflowTrigger,
  nodeTypes: NodeType[]
): Node[] {
  const nodeTypeIds = getTriggerNodeTypes(trigger);
  const nodes: Node[] = [];

  for (let i = 0; i < nodeTypeIds.length; i++) {
    const nodeTypeId = nodeTypeIds[i];
    const nodeType = nodeTypes.find((nt) => nt.type === nodeTypeId);
    if (!nodeType) continue;

    nodes.push({
      id: `${nodeType.type}-${Date.now()}-${i}`,
      name: nodeType.name,
      type: nodeType.type,
      icon: nodeType.icon,
      position: { x: i * 400, y: 0 },
      inputs: nodeType.inputs.map((p) => ({ ...p })),
      outputs: nodeType.outputs.map((p) => ({ ...p })),
      functionCalling: nodeType.functionCalling,
    });
  }

  return nodes;
}
