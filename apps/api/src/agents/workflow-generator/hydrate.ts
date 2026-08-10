import type {
  Edge,
  Node,
  NodeType,
  Parameter,
  Workflow,
  WorkflowTrigger,
} from "@dafthunk/types";
import {
  buildNodeFromNodeType,
  buildTriggerNodes,
  TRIGGER_TO_NODE_TYPES,
} from "@dafthunk/utils";

import {
  agentToolCatalog,
  applyAgentTools,
  isAgentNodeType,
} from "./agent-tools";
import { expandPseudoNode } from "./ai-nodes";
import type {
  EnrichedValidationError,
  GeneratedWorkflowDraft,
} from "./draft-types";
import { findSimilarTypes } from "./node-search";

/** Fixed ids for the server-injected nodes, referenced by name in the prompt. */
/** The node whose recipient the server can fill in when nobody else did. */
const SEND_EMAIL_TYPE = "send-email";

import type {
  OrgResource,
  OrgResources,
  OrgResourceType,
} from "./org-resources";
import { PASSIVE_BINDABLE_TYPES, resourceToBind } from "./org-resources";

export const TRIGGER_NODE_ID = "trigger";
export const RESPONDER_NODE_ID = "responder";

// Derived rather than restated: TRIGGER_TO_NODE_TYPES is typed
// Record<WorkflowTrigger, …>, so it fails to compile when a trigger is added.
// A hand-maintained copy here would silently go stale instead.
const VALID_TRIGGERS: ReadonlySet<string> = new Set(
  Object.keys(TRIGGER_TO_NODE_TYPES)
);

/**
 * Common near-misses. `POST /workflows` types `trigger` as a bare string, so an
 * unrecognized value would be stored and produce a workflow the UI cannot
 * classify — normalizing here is the only thing standing in the way.
 */
const TRIGGER_ALIASES: Record<string, WorkflowTrigger> = {
  webhook: "http_webhook",
  http: "http_request",
  https: "http_request",
  request: "http_request",
  api: "http_request",
  cron: "scheduled",
  schedule: "scheduled",
  timer: "scheduled",
  email: "email_message",
  mail: "email_message",
  form: "form_request",
  queue: "queue_message",
  discord: "discord_event",
  telegram: "telegram_event",
  whatsapp: "whatsapp_event",
  slack: "slack_event",
  none: "manual",
};

export function normalizeTrigger(raw: string): WorkflowTrigger | undefined {
  const value = raw
    ?.trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (VALID_TRIGGERS.has(value)) return value as WorkflowTrigger;
  // No alias key contains an underscore, so stripping them is the only lookup
  // that can ever match.
  return TRIGGER_ALIASES[value.replace(/_/g, "")];
}

/**
 * Input parameter types whose value registers a live trigger when the workflow
 * is saved. `WorkflowStore.syncTriggers` scans saved nodes and upserts rows
 * with `active: true`, and `workflows.enabled` defaults to true — so a
 * generated schedule or mailbox would start firing the moment it is stored.
 * Blanking them means the extractors find nothing and the workflow lands inert.
 */
const TRIGGER_ARMING_TYPES: ReadonlySet<string> = new Set([
  "queue",
  "email",
  "discord",
  "telegram",
  "whatsapp",
  "slack",
]);

/**
 * `scheduleExpression` is typed plain `string`, so the type list above cannot
 * catch it — and the registry ships it with a `"0 0 * * *"` default, which is
 * the one arming value that actually arrives populated. Every other extractor
 * reads an input whose type is already in `TRIGGER_ARMING_TYPES`.
 */
const TRIGGER_ARMING_INPUT_NAMES: ReadonlySet<string> = new Set([
  "scheduleExpression",
]);

/** One trigger binding blanked at save time, kept so `arm` can restore it. */
export interface DisarmedInput {
  nodeId: string;
  inputName: string;
  value: unknown;
}

function disarm(node: Node, collected: DisarmedInput[]): Node {
  return {
    ...node,
    inputs: node.inputs.map((input: Parameter) => {
      const arming =
        TRIGGER_ARMING_TYPES.has(input.type) ||
        TRIGGER_ARMING_INPUT_NAMES.has(input.name);
      if (!arming) return input;

      // Only a value that was actually there is worth remembering — the
      // restore path writes these back verbatim, and re-arming an input that
      // never had a value would invent one.
      if (input.value !== undefined) {
        collected.push({
          nodeId: node.id,
          inputName: input.name,
          value: input.value,
        });
      }
      return { ...input, value: undefined } as Parameter;
    }),
  };
}

/**
 * Materializes the inputs a `dynamicInputs` node needs to satisfy the edges
 * pointing at it. `var-string-template` declares only `var_1`, so a two-variable
 * template fails `INVALID_CONNECTION` every single time without this.
 */
function expandDynamicInputs(
  node: Node,
  nodeType: NodeType,
  edges: Edge[]
): Node {
  const config = nodeType.dynamicInputs;
  if (!config) return node;

  const existing = new Set(node.inputs.map((i) => i.name));
  const pattern = new RegExp(`^${config.prefix}_(\\d+)$`);

  const wanted = new Set<string>();
  for (const edge of edges) {
    if (edge.target !== node.id) continue;
    if (pattern.test(edge.targetInput)) wanted.add(edge.targetInput);
  }

  const added: Parameter[] = [];
  for (const name of wanted) {
    if (existing.has(name)) continue;
    added.push({
      name,
      type: config.type,
      description: `Dynamic input ${name}`,
    } as Parameter);
  }
  if (added.length === 0) return node;

  const sorted = added.sort((a, b) => {
    const ai = Number(a.name.match(pattern)?.[1] ?? 0);
    const bi = Number(b.name.match(pattern)?.[1] ?? 0);
    return ai - bi;
  });

  return { ...node, inputs: [...node.inputs, ...sorted] };
}

/** Left-to-right layered layout, matching the spacing the templates use. */
function layout(nodes: Node[], edges: Edge[]): Node[] {
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  for (const node of nodes) {
    incoming.set(node.id, 0);
    outgoing.set(node.id, []);
  }
  for (const edge of edges) {
    if (!incoming.has(edge.target) || !outgoing.has(edge.source)) continue;
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    outgoing.get(edge.source)?.push(edge.target);
  }

  const depth = new Map<string, number>();
  let frontier = nodes.filter((n) => (incoming.get(n.id) ?? 0) === 0);
  for (const node of frontier) depth.set(node.id, 0);

  // Kahn's algorithm. A cycle leaves nodes undepthed; those fall back to layer
  // 0 rather than throwing, because reporting CYCLE_DETECTED is the validator's
  // job and it produces a far better message than a layout crash would.
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const remaining = new Map(incoming);
  while (frontier.length) {
    const next: Node[] = [];
    for (const node of frontier) {
      for (const targetId of outgoing.get(node.id) ?? []) {
        remaining.set(targetId, (remaining.get(targetId) ?? 1) - 1);
        const candidate = (depth.get(node.id) ?? 0) + 1;
        if (candidate > (depth.get(targetId) ?? -1))
          depth.set(targetId, candidate);
        if ((remaining.get(targetId) ?? 0) === 0) {
          const target = byId.get(targetId);
          if (target) next.push(target);
        }
      }
    }
    frontier = next;
  }

  const perLayer = new Map<number, number>();
  return nodes.map((node) => {
    const layer = depth.get(node.id) ?? 0;
    const index = perLayer.get(layer) ?? 0;
    perLayer.set(layer, index + 1);
    return { ...node, position: { x: layer * 400, y: index * 200 } };
  });
}

/** A resource this hydration chose on the user's behalf, so it can be said. */
export interface BoundResource {
  type: OrgResourceType;
  name: string;
}

export interface HydrateResult {
  workflow: Workflow;
  errors: EnrichedValidationError[];
  /** Empty unless `orgResources` was supplied and something needed binding. */
  boundResources: BoundResource[];
  /**
   * The trigger bindings blanked before save, in restore order. Non-empty
   * means the saved workflow is dormant: it will not fire on its own until
   * these are written back — which is what the `arm` turn does.
   */
  disarmed: DisarmedInput[];
}

export interface HydrateOptions {
  /**
   * Address to use when a `send-email` node has no recipient.
   *
   * Passed only when the workflow is meant to mail the person who asked for it
   * — the model never sees who that is, so it could not fill this in however
   * hard it tried. A default, never an override: a node whose recipient the
   * model set, or wired an edge into, is left exactly as it is, because
   * "reply to the customer" must not quietly become "reply to the owner".
   */
  ownerEmail?: string;
  /**
   * What the org owns, for inputs that hold a resource id rather than a value.
   *
   * The model is never shown these ids — they mean nothing to it and it would
   * only invent plausible ones. Fallback binding happens here, after the graph
   * exists, and only for the types `PASSIVE_BINDABLE_TYPES` allows.
   */
  orgResources?: OrgResources;
  /**
   * Explicit instance choices, one per family — what the brief's blanks and
   * the resource resolver settled on. These win over the oldest-fallback, and
   * they are the ONLY way an arming type (queue, email, bot) gets a value:
   * bound before `disarm` runs, so a binding on the trigger node lands in
   * `disarmed` and is restored by the `arm` turn rather than firing on save.
   */
  bindings?: Partial<Record<OrgResourceType, OrgResource>>;
}

/**
 * Turns the model's thin draft into a full `Workflow`.
 *
 * Node ports are materialized from the registry rather than trusted from the
 * model, which removes an entire class of failure: the model can name a type
 * wrongly, but it cannot describe a real type's ports wrongly.
 */
export function hydrateGeneratedWorkflow(
  draft: GeneratedWorkflowDraft,
  nodeTypes: NodeType[],
  candidates: NodeType[],
  options: HydrateOptions = {}
): HydrateResult {
  const { ownerEmail, orgResources, bindings } = options;
  const errors: EnrichedValidationError[] = [];
  const byType = new Map(nodeTypes.map((nt) => [nt.type, nt]));

  const trigger = normalizeTrigger(String(draft.trigger));
  if (!trigger) {
    return {
      workflow: {
        id: "",
        name: draft.title,
        description: draft.description,
        trigger: "manual",
        nodes: [],
        edges: [],
      },
      errors: [
        {
          code: "TRIGGER_INVALID",
          severity: "fatal",
          message: `"${draft.trigger}" is not a valid workflow trigger.`,
          fix: `Set "trigger" to one of: ${[...VALID_TRIGGERS].join(", ")}.`,
        },
      ],
      boundResources: [],
      disarmed: [],
    };
  }

  // Server-owned trigger/responder nodes. Built armed, and disarmed at the
  // very end — after binding and configuration merging — so that everything
  // meant to arm them lands in `disarmed`, where the `arm` turn restores it.
  const disarmed: DisarmedInput[] = [];
  const injected = buildTriggerNodes(trigger, nodeTypes, {
    idFor: (_nodeType: NodeType, index: number) =>
      index === 0 ? TRIGGER_NODE_ID : RESPONDER_NODE_ID,
  });

  const injectedIds = new Set(injected.map((n: Node) => n.id));
  const triggerTypeIds = new Set(
    nodeTypes.filter((nt) => nt.trigger || nt.responder).map((nt) => nt.type)
  );

  const nodes: Node[] = [...injected];

  for (const draftNode of draft.nodes) {
    if (injectedIds.has(draftNode.id)) {
      // The model does not own the trigger node — but it is the only one who
      // knows the configuration the request implies: the cron line behind
      // "every morning at 8" has nowhere else to come from. Its literal
      // inputs are merged onto the injected node; the node itself stays
      // server-built, and `disarm` will still blank the arming values.
      const target = nodes.find((node) => node.id === draftNode.id);
      if (target && draftNode.inputs) {
        for (const [name, value] of Object.entries(draftNode.inputs)) {
          const input = target.inputs.find((entry) => entry.name === name);
          if (input) input.value = value as Parameter["value"];
        }
      }
      continue;
    }
    if (triggerTypeIds.has(draftNode.type)) continue;

    // Returns undefined for anything that isn't a pseudo type, so this doubles
    // as the membership test.
    const expanded = expandPseudoNode(draftNode.type, {
      id: draftNode.id,
      name: draftNode.name,
      position: { x: 0, y: 0 },
      inputs: draftNode.inputs,
    });
    if (expanded) {
      nodes.push(expanded);
      continue;
    }

    const nodeType = byType.get(draftNode.type);
    if (!nodeType) {
      const suggestions = findSimilarTypes(draftNode.type, candidates, 3);
      errors.push({
        code: "UNKNOWN_NODE_TYPE",
        severity: "fatal",
        message: `No node type "${draftNode.type}" exists.`,
        fix: suggestions.length
          ? `Replace node "${draftNode.id}" type "${draftNode.type}" with one of: ${suggestions.join(", ")}. Only use types listed in the catalog.`
          : `Remove node "${draftNode.id}" or replace its type with one from the catalog. "${draftNode.type}" does not exist.`,
        nodeId: draftNode.id,
      });
      continue;
    }

    nodes.push(
      buildNodeFromNodeType(nodeType, {
        id: draftNode.id,
        name: draftNode.name,
        position: { x: 0, y: 0 },
        inputs: draftNode.inputs,
      })
    );
  }

  if (ownerEmail) {
    const fed = new Set(
      (draft.edges ?? [])
        .filter((edge) => edge.targetInput === "to")
        .map((edge) => edge.target)
    );

    for (const node of nodes) {
      if (node.type !== SEND_EMAIL_TYPE || fed.has(node.id)) continue;
      const recipient = node.inputs.find((input) => input.name === "to");
      if (recipient && !recipient.value) recipient.value = ownerEmail;
    }
  }

  // Bind org-owned resources, before `disarm` so a binding on the trigger
  // node is collected rather than saved live. Explicit bindings — the ones a
  // person or the resolver chose — apply to any family; the oldest-fallback
  // stays restricted to the passive types, because falling back must never be
  // able to arm anything.
  const boundResources: BoundResource[] = [];
  if (orgResources || bindings) {
    const seen = new Set<string>();
    for (const node of nodes) {
      for (const input of node.inputs) {
        if (input.value !== undefined) continue;
        const type = input.type as OrgResourceType;

        let resource: OrgResource | undefined = bindings?.[type];
        if (!resource) {
          if (!PASSIVE_BINDABLE_TYPES.has(type)) continue;
          // A structured-output schema must not contain blob fields, and an
          // OrgResource cannot say whether one does — so scoped inputs are
          // never filled by fallback. An explicit choice above still lands:
          // the person picked it, and the consuming node enforces the scope
          // at runtime.
          if (input.type === "schema" && input.scope === "structured-output") {
            continue;
          }
          resource = orgResources
            ? resourceToBind(orgResources, type)
            : undefined;
        }

        if (!resource) continue;
        input.value = resource.id;
        if (!seen.has(type)) {
          seen.add(type);
          boundResources.push({ type, name: resource.name });
        }
      }
    }
  }

  // Disarm last. A bound mailbox or queue on the trigger node moves into
  // `disarmed`, so the save is inert and the `arm` turn writes it back when
  // the person turns the workflow on. Mid-graph arming-typed inputs are left
  // alone: `syncTriggers` never reads them, and blanking would fabricate
  // MISSING_REQUIRED_INPUT errors.
  for (let index = 0; index < nodes.length; index++) {
    if (injectedIds.has(nodes[index].id)) {
      nodes[index] = disarm(nodes[index], disarmed);
    }
  }

  /**
   * Settle every agent's tools against the allowlist.
   *
   * Runs over the built nodes rather than the draft, so a tool reference the
   * model put on a node that is not an agent simply never appears — the input
   * does not exist there and `buildNodeFromNodeType` dropped it already.
   *
   * A refused tool is reported rather than quietly removed. Fatal when nothing
   * usable is left, because an agent with an empty tool list is a slower
   * `ai-text` that was asked to go and look something up: it cannot do the job
   * and it will not say so, it will answer from what it already knows.
   */
  const allowedTools = new Set(
    agentToolCatalog(nodeTypes).map((nodeType) => nodeType.type)
  );

  for (const node of nodes) {
    // Only the loop nodes. The Gemini model nodes and the email agent also
    // carry a `tools` input, and neither is offered here — rewriting theirs
    // would be this pass touching something it was never asked about.
    const nodeType = byType.get(node.type);
    if (!nodeType || !isAgentNodeType(nodeType)) continue;

    const { kept, rejected } = applyAgentTools(node, allowedTools);
    if (rejected.length === 0) continue;

    const offered = [...allowedTools].join(", ");
    errors.push({
      code: "UNKNOWN_TOOL",
      severity: kept.length === 0 ? "fatal" : "warning",
      message: `"${node.id}" asked for ${rejected.length === 1 ? "a tool" : "tools"} it cannot use: ${rejected.join(", ")}.`,
      fix:
        kept.length === 0
          ? `Node "${node.id}" (type ${node.type}) has no usable tool left. Set its "tools" to references drawn from: ${offered} — for example [{"type":"node","identifier":"fetch"}]. If none of those fit the task, drop the agent and build the steps as ordinary nodes instead.`
          : `Node "${node.id}" (type ${node.type}) kept ${kept.map((tool) => `"${tool.identifier}"`).join(", ")} and dropped the rest. Only these can be used as tools: ${offered}.`,
      nodeId: node.id,
    });
  }

  // Keep only edges whose endpoints survived, so downstream validation reports
  // real problems rather than fallout from a dropped node.
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = (draft.edges ?? []).filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
  );

  const expanded = nodes.map((node) => {
    const nodeType = byType.get(node.type);
    return nodeType ? expandDynamicInputs(node, nodeType, edges) : node;
  });

  return {
    workflow: {
      id: "",
      name: draft.title,
      description: draft.description,
      trigger,
      nodes: layout(expanded, edges),
      edges,
    },
    errors,
    boundResources,
    disarmed,
  };
}
