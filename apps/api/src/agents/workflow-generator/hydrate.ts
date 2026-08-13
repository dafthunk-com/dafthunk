import { FIELD_TYPE_TO_PARAMETER_TYPE } from "@dafthunk/runtime/nodes/form/form-trigger-base";
import type {
  Edge,
  Node,
  NodeType,
  Parameter,
  Workflow,
} from "@dafthunk/types";
import {
  buildNodeFromNodeType,
  buildTriggerNodes,
  hashSchemaFields,
  SCHEMA_FIELDS_HASH_KEY,
} from "@dafthunk/utils";
import {
  agentToolCatalog,
  applyAgentTools,
  isAgentNodeType,
  TOOL_REFERENCE_EXAMPLE,
} from "./agent-tools";
import { expandPseudoNode } from "./ai-nodes";
import type {
  EnrichedValidationError,
  GeneratedWorkflowDraft,
} from "./draft-types";
import { findSimilarTypes } from "./node-search";
import type {
  OrgResource,
  OrgResources,
  OrgResourceType,
} from "./org-resources";
import { PASSIVE_BINDABLE_TYPES, resourceToBind } from "./org-resources";
import { normalizeTrigger, VALID_TRIGGERS } from "./triggers";

/** The node whose recipient the server can fill in when nobody else did. */
const SEND_EMAIL_TYPE = "send-email";

/** Fixed ids for the server-injected nodes, referenced by name in the prompt. */
export const TRIGGER_NODE_ID = "trigger";
export const RESPONDER_NODE_ID = "responder";

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

/** A connected account this hydration wired in, one entry per provider. */
export interface BoundIntegration {
  provider: string;
  name: string;
}

export interface HydrateResult {
  workflow: Workflow;
  errors: EnrichedValidationError[];
  /** Empty unless `orgResources` was supplied and something needed binding. */
  boundResources: BoundResource[];
  /** Empty unless `integrations` was supplied and a provider node matched. */
  boundIntegrations: BoundIntegration[];
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
  /**
   * Schemas by node id — the one family that binds per node.
   *
   * A schema is a shape, not a place, and one workflow needs several: what the
   * form asks for, what the model must emit, what the table's columns are.
   * Consulted before `bindings.schema`, which is now only the workflow-wide
   * default for nodes that were given no shape of their own.
   */
  schemasByNode?: ReadonlyMap<string, OrgResource>;
  /**
   * Connected integrations by provider, for `integration` inputs.
   *
   * Like `orgResources`, the model never sees these ids. An input the model
   * (or an adopted workflow) already set is left alone; an empty one is bound
   * to the org's account for its declared provider. A provider absent from
   * the map stays unbound — the rehearsal stubs that node, and the outcome
   * screen offers to connect it.
   */
  integrations?: ReadonlyMap<string, { id: string; name: string }>;
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
  const { ownerEmail, orgResources, bindings, schemasByNode, integrations } =
    options;
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
      boundIntegrations: [],
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
  if (orgResources || bindings || schemasByNode) {
    const seen = new Set<string>();
    for (const node of nodes) {
      // Applied after the loop below, not inside it: deriving the input side
      // appends to the very array being iterated.
      let derivedPorts: Parameter[] | undefined;
      let derivedSide: "inputs" | "outputs" | undefined;

      for (const input of node.inputs) {
        if (input.value !== undefined) continue;
        const type = input.type as OrgResourceType;

        /**
         * The shape this node was given, before any family-wide choice.
         *
         * There is no fallback under it. A schema's fields become the node's
         * ports, so binding whichever schema the workspace happens to own
         * oldest does not produce a workflow with a defensible default — it
         * produces a form asking for someone else's fields. Better an unset
         * input the repair round and the editor can both see.
         */
        const ownShape =
          type === "schema" ? schemasByNode?.get(node.id) : undefined;

        // A structured-output schema must not contain blob fields, and a shape
        // chosen for the workflow at large says nothing about what this node
        // may emit. Only a shape written for this node lands on one.
        if (
          !ownShape &&
          input.type === "schema" &&
          input.scope === "structured-output"
        ) {
          continue;
        }

        let resource: OrgResource | undefined = ownShape;
        resource ??= bindings?.[type];
        if (!resource) {
          if (!PASSIVE_BINDABLE_TYPES.has(type)) continue;
          resource = orgResources
            ? resourceToBind(orgResources, type)
            : undefined;
        }

        if (!resource) continue;
        input.value = resource.id;
        // Keyed by instance for schemas, since several distinct ones legitimately
        // land in one workflow and each is worth naming once.
        const mention = type === "schema" ? `${type}:${resource.id}` : type;
        if (!seen.has(mention)) {
          seen.add(mention);
          boundResources.push({ type, name: resource.name });
        }

        /**
         * Some nodes' ports are their schema's fields.
         *
         * The form triggers and `json-schema-extract` declare one side empty
         * and grow it from the selected schema; `json-schema-compose` does the
         * same on its input side. The editor writes those ports when someone
         * picks a schema, and each node reads them back by field name at run
         * time — but nothing did it on this path, so a bound node reached
         * validation with no usable ports. Every edge touching one was fatal
         * and unfixable, because the only advice the repair could offer was
         * "its ports are: none". Measured as two cases burning their whole
         * repair budget: one on `UNKNOWN_OUTPUT_PORT` off a form trigger, one
         * on `UNKNOWN_INPUT_PORT` into a compose node.
         *
         * Derived here rather than in the draft because the model never sees
         * the schema's fields — the catalog carries node types, not the org's
         * data. Once the ports exist, the existing repair prompt names them and
         * the round after can wire the edge it meant to.
         *
         * Driven by the node type's own `schemaPorts` declaration rather than
         * by a list kept here, which would go stale the first time somebody
         * added a fifth such node. `database-query` also takes a `schema`, to
         * coerce its results, and declares nothing — so its ports are left
         * alone, which is the whole point of asking the node.
         */
        if (input.type === "schema" && resource.fields?.length) {
          const derived = byType.get(node.type)?.schemaPorts;
          if (derived) {
            const ports = resource.fields.map((field) => ({
              name: field.name,
              type: (FIELD_TYPE_TO_PARAMETER_TYPE[field.type] ??
                "any") as Parameter["type"],
              description: field.label ?? field.name,
            })) as Parameter[];

            derivedPorts = ports;
            derivedSide = derived;

            // The same signature the editor stamps when a person picks a
            // schema. Without it a generated workflow has no baseline, so the
            // widget can never tell the user their schema has since moved.
            node.metadata = {
              ...(node.metadata ?? {}),
              [SCHEMA_FIELDS_HASH_KEY]: hashSchemaFields(resource.fields),
            };
          }
        }
      }

      if (derivedPorts && derivedSide === "outputs") {
        node.outputs = derivedPorts;
      } else if (derivedPorts) {
        // Appended, not replaced: the `schema` input is what bound the
        // resource in the first place, and dropping it would strip the
        // binding this loop just made.
        node.inputs = [...node.inputs, ...derivedPorts];
      }
    }
  }

  // Bind connected integrations onto `integration` inputs the model left
  // empty. Same principle as `ownerEmail`: the model never sees who is
  // connected, so the binding can only happen here — and a value already
  // present (an adopted workflow's explicit account choice) always wins.
  const boundIntegrations: BoundIntegration[] = [];
  if (integrations) {
    const seen = new Set<string>();
    for (const node of nodes) {
      for (const input of node.inputs) {
        if (input.type !== "integration" || input.value !== undefined) continue;
        const integration = integrations.get(input.provider);
        if (!integration) continue;
        input.value = integration.id;
        if (!seen.has(input.provider)) {
          seen.add(input.provider);
          boundIntegrations.push({
            provider: input.provider,
            name: integration.name,
          });
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
          ? `Node "${node.id}" (type ${node.type}) has no usable tool left. Set its "tools" to references drawn from: ${offered} — for example ${TOOL_REFERENCE_EXAMPLE}. If none of those fit the task, drop the agent and build the steps as ordinary nodes instead.`
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
    boundIntegrations,
    disarmed,
  };
}
