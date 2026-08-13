import type { Field, FieldType, NodeType } from "@dafthunk/types";
import { IDENTIFIER_PATTERN } from "@dafthunk/types";
import { TRIGGER_TO_NODE_TYPES } from "@dafthunk/utils";

import type { DraftResource, GeneratedWorkflowDraft } from "./draft-types";
import { RESPONDER_NODE_ID, TRIGGER_NODE_ID } from "./hydrate";
import { normalizeTrigger } from "./triggers";

/**
 * The shapes the graph implies, for the nodes the model gave none.
 *
 * A form trigger declares no outputs and a form response declares no inputs;
 * both grow them from the schema they are bound to. So a draft that wires
 * edges off a form trigger has already said what the form's fields are — it
 * named them in `sourceOutput`, and the node at the other end of each wire
 * says what type it expects there. That is a schema, written by the model
 * without being asked for one.
 *
 * This question used to be answered by binding the workspace's oldest schema,
 * which is a guess about the user's data rather than a reading of the draft:
 * it made the form ask for whatever some unrelated schema happened to contain.
 * Read off the edges it cannot be wrong that way — at worst the shape is
 * incomplete, and the repair round that follows gets to name real ports.
 */

/** Parameter type back to the field type that would produce it. */
const PARAMETER_TYPE_TO_FIELD_TYPE: Record<string, FieldType> = {
  string: "string",
  number: "number",
  boolean: "boolean",
  date: "datetime",
  json: "json",
  image: "image",
  document: "document",
  audio: "audio",
  video: "video",
  blob: "blob",
};

/**
 * `number` covers both `integer` and `number`, so the inverse is lossy in one
 * place and `number` is the forgiving half of that pair. An `any` port says
 * nothing about its value, and a string field accepts the most.
 */
function toFieldType(parameterType: string | undefined): FieldType {
  if (!parameterType) return "string";
  return PARAMETER_TYPE_TO_FIELD_TYPE[parameterType] ?? "string";
}

interface ShapedNode {
  id: string;
  type: string;
  nodeType: NodeType;
}

/**
 * Every node that grows ports from a schema, including the two the server
 * injects. Those two are the whole point: a form workflow's shape belongs to
 * the trigger and the responder, and neither appears in `draft.nodes`.
 */
function portDerivingNodes(
  draft: GeneratedWorkflowDraft,
  byType: Map<string, NodeType>
): ShapedNode[] {
  const found: ShapedNode[] = [];
  const seen = new Set<string>();

  const add = (id: string, type: string | undefined) => {
    if (!id || !type || seen.has(id)) return;
    const nodeType = byType.get(type);
    if (!nodeType?.schemaPorts) return;
    seen.add(id);
    found.push({ id, type, nodeType });
  };

  const trigger = normalizeTrigger(String(draft.trigger));
  const injected = trigger ? (TRIGGER_TO_NODE_TYPES[trigger] ?? []) : [];
  add(TRIGGER_NODE_ID, injected[0]);
  add(RESPONDER_NODE_ID, injected[1]);

  for (const node of Array.isArray(draft.nodes) ? draft.nodes : []) {
    if (node?.id) add(node.id, node.type);
  }

  return found;
}

/** What to call a shape, given the node whose ports it defines. */
function shapeName(draft: GeneratedWorkflowDraft, node: ShapedNode): string {
  const subject = draft.title?.trim() || "workflow";
  if (node.nodeType.trigger) return `${subject} submission`;
  if (node.nodeType.responder) return `${subject} response`;
  return `${subject} ${node.id}`;
}

export interface DeriveSchemaShapesInput {
  draft: GeneratedWorkflowDraft;
  /** The full registry, which is where `schemaPorts` and port types live. */
  nodeTypes: NodeType[];
}

/**
 * Schema resources for every port-deriving node the draft left unshaped,
 * expressed as `DraftResource`s so they resolve exactly like the model's own:
 * matched against the workspace by shape and name, created only when new.
 */
export function deriveSchemaShapes({
  draft,
  nodeTypes,
}: DeriveSchemaShapesInput): DraftResource[] {
  const byType = new Map(
    nodeTypes.map((nodeType) => [nodeType.type, nodeType])
  );
  const declared = (
    Array.isArray(draft.resources) ? draft.resources : []
  ).filter((entry) => entry?.family === "schema" && entry.fields?.length);

  // A shape declared for no node in particular stands for the whole workflow,
  // the way schemas bound before they were per-node. Nothing left to derive.
  if (declared.some((entry) => !entry.nodeId)) return [];
  const claimed = new Set(declared.map((entry) => entry.nodeId));

  const edges = Array.isArray(draft.edges) ? draft.edges : [];
  const types = new Map(
    (Array.isArray(draft.nodes) ? draft.nodes : [])
      .filter((node) => node?.id)
      .map((node) => [node.id, node.type])
  );

  const derived: DraftResource[] = [];
  for (const node of portDerivingNodes(draft, byType)) {
    if (claimed.has(node.id)) continue;

    const named =
      node.nodeType.schemaPorts === "outputs"
        ? edges
            .filter((edge) => edge?.source === node.id)
            .map((edge) => ({
              name: edge.sourceOutput,
              type: byType
                .get(types.get(edge.target) ?? "")
                ?.inputs.find((port) => port.name === edge.targetInput)?.type,
            }))
        : edges
            .filter((edge) => edge?.target === node.id)
            .map((edge) => ({
              name: edge.targetInput,
              type: byType
                .get(types.get(edge.source) ?? "")
                ?.outputs.find((port) => port.name === edge.sourceOutput)?.type,
            }));

    const fields = collect(named);
    if (!fields.length) continue;

    derived.push({
      family: "schema",
      action: "create",
      name: shapeName(draft, node),
      nodeId: node.id,
      fields,
    });
  }

  return derived;
}

/** One field per distinct port name, first mention winning, order preserved. */
function collect(
  named: Array<{ name: string; type: string | undefined }>
): Field[] {
  const fields = new Map<string, Field>();
  for (const { name, type } of named) {
    // A port name that is not an identifier cannot be a field name: the
    // schemas route refuses it and the provisioner drops it silently.
    if (!name || !IDENTIFIER_PATTERN.test(name) || fields.has(name)) continue;
    fields.set(name, { name, type: toFieldType(type) });
  }
  return [...fields.values()];
}
