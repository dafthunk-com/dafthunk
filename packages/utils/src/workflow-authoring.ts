/**
 * Helpers for authoring workflow graphs outside the editor.
 *
 * Lives in `@dafthunk/utils` because both the app (which builds starter nodes
 * when creating a workflow) and the API (which builds whole graphs) need them,
 * and the app cannot depend on `@dafthunk/runtime`.
 */

import type {
  Node,
  NodeType,
  ParameterType,
  WorkflowTrigger,
} from "@dafthunk/types";

/**
 * Node type(s) auto-added for each trigger. `manual` has none: a manual
 * workflow starts from input nodes. The two `*_request` triggers pair a trigger
 * with its responder; the edge between them is left to the author.
 */
const TRIGGER_TO_NODE_TYPES: Record<WorkflowTrigger, string[]> = {
  manual: [],
  scheduled: ["receive-scheduled-trigger"],
  http_webhook: ["http-webhook"],
  http_request: ["http-request", "http-response"],
  form_webhook: ["form-webhook"],
  form_request: ["form-request", "form-response"],
  email_message: ["receive-email"],
  queue_message: ["queue-message"],
  discord_event: ["receive-discord-message"],
  telegram_event: ["receive-telegram-message"],
  whatsapp_event: ["receive-whatsapp-message"],
  slack_event: ["receive-slack-message"],
};

export { TRIGGER_TO_NODE_TYPES };

/** All node type IDs that are trigger nodes. */
export const ALL_TRIGGER_NODE_TYPE_IDS: ReadonlySet<string> = new Set(
  Object.values(TRIGGER_TO_NODE_TYPES).flat()
);

/** Returns the node type IDs to add for a given trigger type. */
export function getTriggerNodeTypes(trigger: WorkflowTrigger): string[] {
  return TRIGGER_TO_NODE_TYPES[trigger] ?? [];
}

/**
 * Parameter types an example must never supply: each names an org-scoped
 * resource or a credential, so a literal would be meaningless or unsafe.
 *
 * Note this is about the parameter's *type*, not its `hidden` flag. Input-widget
 * nodes mark their value input hidden because the widget renders it inline, and
 * those are precisely the values an example exists to set.
 */
export const NON_LITERAL_PARAMETER_TYPES: ReadonlySet<ParameterType["type"]> =
  new Set<ParameterType["type"]>([
    "secret",
    "integration",
    "database",
    "dataset",
    "queue",
    "email",
    "discord",
    "telegram",
    "whatsapp",
    "slack",
    "schema",
  ]);

export interface BuildNodeOptions {
  id: string;
  name?: string;
  description?: string;
  position: { x: number; y: number };
  /** Literal values keyed by input name; unknown names are ignored. */
  inputs?: Record<string, unknown>;
}

/**
 * Materializes a `Node` from a `NodeType`, copying the full input/output
 * parameter arrays so the resulting graph is self-describing.
 *
 * This is the single definition of that mapping. `ExecutableNode.create`
 * delegates here, which is why it takes the node type as an argument rather
 * than reading it off a class.
 */
export function buildNodeFromNodeType(
  nodeType: NodeType,
  options: BuildNodeOptions
): Node {
  const inputs = nodeType.inputs.map((input) => {
    const override = options.inputs?.[input.name];
    if (override !== undefined) {
      return { ...input, value: override };
    }
    return { ...input };
  });

  return {
    id: options.id,
    name: options.name ?? nodeType.name,
    type: nodeType.type,
    description: options.description ?? nodeType.description,
    icon: nodeType.icon,
    position: options.position,
    inputs,
    outputs: nodeType.outputs.map((output) => ({ ...output })),
    ...(nodeType.functionCalling && { functionCalling: true }),
    ...(nodeType.metadata && { metadata: { ...nodeType.metadata } }),
  } as Node;
}

export interface BuildTriggerNodesOptions {
  /** Overrides the generated node id. Defaults to `${type}-${uuid}`. */
  idFor?: (nodeType: NodeType, index: number) => string;
}

/**
 * Builds the starter node(s) for a trigger, laid out horizontally.
 *
 * A node type that isn't registered in this environment is skipped rather than
 * faked — roughly a fifth of node registrations sit behind env-var flags.
 */
export function buildTriggerNodes(
  trigger: WorkflowTrigger,
  nodeTypes: NodeType[],
  options: BuildTriggerNodesOptions = {}
): Node[] {
  const idFor =
    options.idFor ??
    ((nodeType: NodeType) => `${nodeType.type}-${crypto.randomUUID()}`);

  const nodes: Node[] = [];
  const nodeTypeIds = getTriggerNodeTypes(trigger);

  for (let i = 0; i < nodeTypeIds.length; i++) {
    const nodeType = nodeTypes.find((nt) => nt.type === nodeTypeIds[i]);
    if (!nodeType) continue;

    nodes.push(
      buildNodeFromNodeType(nodeType, {
        id: idFor(nodeType, i),
        position: { x: i * 400, y: 0 },
      })
    );
  }

  return nodes;
}
