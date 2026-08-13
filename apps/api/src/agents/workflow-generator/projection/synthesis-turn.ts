import type { BriefDestination, NodeType } from "@dafthunk/types";
import { FIELD_TYPES } from "@dafthunk/types";
import {
  COMPONENT_FAMILIES,
  explainIncompatibility,
  NON_LITERAL_PARAMETER_TYPES,
  TRIGGER_TO_NODE_TYPES,
} from "@dafthunk/utils";
import { TRIGGER_SAMPLE_KEYS } from "../../../utils/example-inputs";
import { agentToolCatalog, isAgentNodeType } from "../agent-tools";
import { MAX_GENERATED_EXAMPLES } from "../config";
import type { Ineligible } from "../eligibility";
import {
  AI_CAPABILITIES,
  OFFERED_AI_TYPES,
  withheldProviders,
} from "../eligibility";
import {
  type GroundingContext,
  projectGroundingForSynthesis,
} from "../grounding";
import { RESPONDER_NODE_ID, TRIGGER_NODE_ID } from "../hydrate";
import { PLACE_RESOURCE_TYPES, SHAPE_RESOURCE_TYPES } from "../org-resources";
import { selectExamples, templateToEmitFormat } from "../template-examples";
import { projectCatalog } from "./catalog";

/** `"a"|"b"|"c"` — the union form a JSON Schema description states inline. */
function union(values: readonly string[]): string {
  return values.map((value) => `"${value}"`).join("|");
}

/**
 * What the `resources` array may carry.
 *
 * Every list in it is derived. Three of them used to be typed out, and two had
 * already drifted: the family union named eight of the nine the wire accepts,
 * leaving `schema` looking like a family the server would reject, and the field
 * union named ten of eleven, so a schema the server itself derived could carry
 * a `blob` the model had been told did not exist.
 *
 * The place/shape split is `SHAPE_RESOURCE_TYPES`, which is where the rest of
 * the module already draws it.
 */
function describeResources(): string {
  const place = `{"family": ${union(PLACE_RESOURCE_TYPES)}, "action": "use"|"create", "name": "...", "description": "..."}`;
  const shape = `{"family": ${union([...SHAPE_RESOURCE_TYPES])}, "action": "create", "name": "...", "description": "...", "nodeId": "the node this shape belongs to", "fields": [{"name": "identifier", "type": ${union(FIELD_TYPES)}, "required": true, "label": "Question"}]}`;

  return `Optional. Workspace components the workflow leans on. Places to read, store or send — ${place} — are reused by the exact name listed under Workspace components, with "create" only when nothing listed fits. Record shapes are written, not chosen: ${shape} — one entry per node that needs one, and the server reuses an identical existing shape by itself. Leave the matching node inputs unset; the server fills the ids.`;
}

/**
 * What a simulated trigger payload may carry, per trigger that takes one.
 *
 * Rendered from `TRIGGER_SAMPLE_KEYS`, which sits beside the function that
 * reads them. The hand-written version listed keys from memory: it left out
 * `attachments` altogether, so no generated example ever exercised an email
 * with one.
 */
function describeTriggerPayloads(): string {
  const lines = Object.entries(TRIGGER_SAMPLE_KEYS).map(
    ([trigger, keys]) => `${trigger}: {${(keys ?? []).join(", ")}}`
  );
  return `Simulated trigger payload. ${lines.join(". ")}. Omit for other triggers.`;
}

/** JSON Schema for the draft, appended to the system prompt by the Anthropic path. */
export const DRAFT_SCHEMA = {
  type: "object",
  required: [
    "title",
    "description",
    "trigger",
    "steps",
    "nodes",
    "edges",
    "examples",
  ],
  properties: {
    title: { type: "string", description: "Short workflow name" },
    description: { type: "string" },
    trigger: {
      type: "string",
      // Derived: the hand-typed copy agreed with the platform when it was
      // written, and nothing would have said so when it stopped.
      enum: Object.keys(TRIGGER_TO_NODE_TYPES),
    },
    steps: {
      type: "array",
      items: { type: "string" },
      description: "Plain-English plan, one line per step",
    },
    nodes: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "type"],
        properties: {
          id: { type: "string" },
          type: { type: "string" },
          name: { type: "string" },
          inputs: {
            type: "object",
            description: "Literal input values keyed by input name",
          },
        },
      },
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        required: ["source", "sourceOutput", "target", "targetInput"],
        properties: {
          source: { type: "string" },
          sourceOutput: { type: "string" },
          target: { type: "string" },
          targetInput: { type: "string" },
        },
      },
    },
    examples: {
      type: "array",
      description: `Up to ${MAX_GENERATED_EXAMPLES} named test inputs. The first one is executed once the workflow is saved.`,
      items: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", description: "What this case exercises" },
          description: { type: "string" },
          nodeValues: {
            type: "object",
            description:
              "Only the values that differ from the node literals, keyed nodeId -> inputName -> value",
          },
          trigger: {
            type: "object",
            description: describeTriggerPayloads(),
          },
        },
      },
    },
    resources: {
      type: "array",
      description: describeResources(),
      items: { type: "object" },
    },
  },
} as const;

/**
 * Inputs on an injected trigger node the model may actually set.
 *
 * `hidden` is the wrong filter here, and using it cost the prompt a fact. It
 * means "no handle on the canvas", which is true of the scheduled trigger's
 * `scheduleExpression` — so the projection dropped the one input a request can
 * imply and nothing else can supply, and the prompt named it in prose instead.
 * A rename would have left that sentence pointing at nothing.
 *
 * The real test is who fills it, and `NON_LITERAL_PARAMETER_TYPES` already
 * declares exactly that: an org-resource id, an integration or a secret is
 * meaningless or unsafe as a literal. Everything else on a trigger is
 * configuration, and the cron line behind "every morning at 8" has nowhere to
 * come from but the request. Re-deriving the set here also dropped `secret`,
 * so a trigger that ever grew one would have been advertised as configurable.
 */
function configurableTriggerInputs(nodeType: NodeType): NodeType["inputs"] {
  return nodeType.inputs.filter(
    (input) => !NON_LITERAL_PARAMETER_TYPES.has(input.type)
  );
}

/**
 * Describes what the server will inject for each trigger choice.
 *
 * The model picks the trigger, but the server owns the trigger and responder
 * nodes — that is what makes DUPLICATE_TRIGGER structurally impossible. So the
 * ports have to be stated up front, for every option, before the model commits.
 */
function describeTriggerOptions(nodeTypes: NodeType[]): string {
  const byType = new Map(nodeTypes.map((nt) => [nt.type, nt]));
  const ports = (parameters: NodeType["inputs"]) =>
    parameters
      .filter((p) => !p.hidden)
      .map((p) => `${p.name}:${p.type}`)
      .join(", ") || "(none)";
  const settable = (parameters: NodeType["inputs"]) =>
    parameters.map((p) => `${p.name}:${p.type}`).join(", ");

  const lines: string[] = [
    `- "manual": no trigger node. Start from input nodes carrying realistic sample values.`,
  ];

  for (const [trigger, typeIds] of Object.entries(TRIGGER_TO_NODE_TYPES)) {
    if (trigger === "manual" || typeIds.length === 0) continue;

    const triggerType = byType.get(typeIds[0]);
    if (!triggerType) continue;

    let line = `- "${trigger}": adds node id "${TRIGGER_NODE_ID}" (type ${triggerType.type}) with outputs ${ports(triggerType.outputs)}`;

    const configurable = configurableTriggerInputs(triggerType);
    if (configurable.length) {
      line += `, configurable by emitting "${TRIGGER_NODE_ID}" with "inputs" carrying ${settable(configurable)}`;
    }

    const responderType = typeIds[1] ? byType.get(typeIds[1]) : undefined;
    if (responderType) {
      line += `, plus node id "${RESPONDER_NODE_ID}" (type ${responderType.type}) with inputs ${ports(responderType.inputs)}. You MUST wire exactly one edge into "${RESPONDER_NODE_ID}" — it is what the caller receives`;
    }

    lines.push(`${line}.`);
  }

  return lines.join("\n");
}

/**
 * The three edges a model gets wrong, chosen to make the rules concrete.
 *
 * The pairs are pedagogy — these are the mistakes worth pre-empting. Every word
 * explaining them is not: it comes from `explainIncompatibility`, the function
 * that will actually reject the edge.
 *
 * `number -> string` is first because its explanation is the general rule,
 * blob flavours and all, stated by the code that enforces it. `json -> string`
 * is the asymmetry that costs the most repair rounds. `image -> audio` is the
 * one people assume works because both are blobs.
 */
const REJECTED_EXAMPLES: ReadonlyArray<readonly [string, string]> = [
  ["number", "string"],
  ["json", "string"],
  ["image", "audio"],
];

/**
 * The type rules, taught by running the predicate rather than paraphrasing it.
 *
 * This section used to be five hand-written bullets restating
 * `parameter-compatibility.ts` — including a hand-copied `BLOB_COMPATIBLE_TYPES`
 * in a different order. Worse than the duplication: it explained the json rule
 * in different words than `explainIncompatibility` uses at failure time, so a
 * repair round opened by asking the model to reconcile two vocabularies for one
 * rule. Now there is one vocabulary, and it belongs to the validator.
 */
function describeTypeRules(): string {
  const rejections = REJECTED_EXAMPLES.map(([from, to]) =>
    explainIncompatibility(from, to)
  ).filter((reason): reason is string => reason !== null);

  // A pair that became legal would silently shorten this section. Better to
  // notice: `prompts.test.ts` asserts the count, and the rule it protects is
  // that every example still demonstrates something.
  return rejections.map((reason) => `- ${reason}`).join("\n");
}

/** `"a", "b" or "c"` — a list of type names as it reads in a sentence. */
function quotedList(types: readonly string[]): string {
  const quoted = types.map((type) => `"${type}"`);
  if (quoted.length <= 1) return quoted[0] ?? "";
  return `${quoted.slice(0, -1).join(", ")} or ${quoted[quoted.length - 1]}`;
}

/**
 * Which model node does which job.
 *
 * Rule 6 used to say "prefer the `ai-*` nodes", which named two of the eight
 * actually offered — a naming convention the curated list had abandoned. Six
 * capabilities were on the table with nothing pointing at them, and the model
 * had to find them by keyword luck in a sixty-entry catalog. Rendered from
 * `AI_CAPABILITIES` so the rule and the list cannot part company again.
 */
function describeModelNodes(catalog: NodeType[]): string {
  const offered = new Set(catalog.map((nodeType) => nodeType.type));

  return AI_CAPABILITIES.flatMap((capability) => {
    // Only what this request's catalog actually contains. Three of the eight
    // curated types are in `CORE_NODE_TYPES` and reach every catalog; the rest
    // have to earn their place by ranking against the request. Naming one that
    // did not is the exact defect this rule was rewritten to fix — a type the
    // model is told to reach for and cannot read the ports of — so the rule
    // narrows with the catalog, the way rule 9 already does.
    const available = capability.types.filter((type) => offered.has(type));
    if (available.length === 0) return [];
    return [`   - ${capability.work}: ${quotedList(available)}`];
  }).join("\n");
}

/**
 * Rule 9, or nothing when this deployment offers no agent node.
 *
 * The agent types are found structurally rather than by name. `isAgentNodeType`
 * is the real test — an agent is a node carrying `tools` and `max_steps` — and
 * its own comment says the `agent-` prefix is the wrong one to use. The rule
 * used it anyway, which is how it came to name a prefix matching one of the
 * eight types on offer.
 *
 * Omitted entirely rather than rendered empty: a rule telling the model to
 * reach for a node that is not in its catalog is worse than no rule, and the
 * list simply ends at 8.
 */
function describeAgentRule(nodeTypes: NodeType[]): string {
  const agents = nodeTypes
    .filter(
      (nodeType) =>
        OFFERED_AI_TYPES.has(nodeType.type) && isAgentNodeType(nodeType)
    )
    .map((nodeType) => nodeType.type);

  if (agents.length === 0) return "";

  return `
9. Use ${quotedList(agents)}, with "tools" set, when the number of steps depends
   on what an earlier step returns — "read the top stories and summarize each
   one" fans out over a list whose length nobody knows while drawing the graph,
   and a fixed chain of nodes has to guess at it. Give the agent the tools it
   needs and say the whole task in its "input". For work whose shape is known in
   advance, the same node without "tools" in a plain pipeline is cheaper and
   easier to read — prefer it.`;
}

function describeWithheld(withheld: Ineligible[]): string {
  const providers = withheldProviders(withheld);

  const notes: string[] = [];
  if (providers.length) {
    notes.push(
      `These services are NOT available on this deployment: ${providers.join(", ")}. If the request needs one, build the workflow up to that point, end that branch in an "output-text" node named after the intended action, and say so in "description". Never pretend the step happened.`
    );
  }
  return notes.join("\n");
}

function describeUnconnected(providers: string[]): string {
  if (!providers.length) return "";
  return `These services are in the catalog but their account is not connected yet: ${providers.join(", ")}. Use their nodes when the request calls for them — the user will connect the account afterwards, and until then the trial run rehearses those steps with stand-in data instead of touching a real account. Do not substitute an "output-text" node for them and do not pretend the account is connected.`;
}

/**
 * The catalog section, rendered.
 *
 * Exported so a caller that needs its size can render it once and hand the
 * string back through `renderedCatalog`. The pipeline records the catalog's
 * share of the prompt on every generation, and measuring it used to mean
 * building the whole ~26,000-character section a second time and throwing it
 * away.
 */
export function renderCatalog(
  catalog: NodeType[],
  nodeTypes: NodeType[]
): string {
  return projectCatalog(catalog, { agentTools: agentToolCatalog(nodeTypes) });
}

export interface SystemPromptInput {
  catalog: NodeType[];
  /** Full registry, used to describe the trigger nodes the server injects. */
  nodeTypes: NodeType[];
  withheld: Ineligible[];
  /** Providers offered without a connected account; their steps rehearse. */
  unconnectedProviders?: string[];
  query: string;
  /** What the workspace owns, so the graph can lean on real components. */
  grounding?: GroundingContext;
  /**
   * What the brief committed to delivering, when there was a brief.
   *
   * `DESTINATION_NOT_REALIZED` is the backstop for this, but a backstop costs a
   * whole repair round every time it fires. Stating the requirement up front is
   * what keeps that check from being the mechanism.
   */
  destination?: BriefDestination;
  /**
   * The catalog section already rendered, when the caller needed its size.
   *
   * An optimization, not a second way to describe the catalog: absent, this
   * renders exactly the same string from `catalog` and `nodeTypes`.
   */
  renderedCatalog?: string;
}

/**
 * Rule 4, sharpened when we know where the result has to go.
 *
 * The generic rule — "every branch must end in an output node" — is satisfied
 * by dropping a value into a widget, which is why a workflow could pass
 * validation while delivering nothing anyone would see.
 */
function describeDelivery(destination: BriefDestination | undefined): string {
  if (!destination) {
    return `4. Every branch must end in an output node so the run shows the user something. Pick it by what was asked for, not by what the data looks like on the way: anything the person wants to see, read or be shown ends in "output-text", even when it started as structured data. "output-json" is for a result something else consumes — somebody who asked for their action items wants to read them, not receive an array. Do not pass model output through a conversion node to get there; "to-json" serializes a value rather than parsing one, so a model's answer arrives as a quoted document with its markdown fence intact instead of as the answer.`;
  }

  const recipient =
    destination.kind === "email"
      ? ` Leave the "to" input empty — the server fills in the address of the person who asked, which you have no way of knowing.`
      : "";

  return `4. The workflow MUST ${destination.label}. Use one of these node types to do it: ${destination.nodeTypes.join(", ")}.${recipient} This is the point of the workflow — a graph that computes the right answer and does not deliver it is wrong. Any other branch must still end in an output node.`;
}

export function buildSystemPrompt(input: SystemPromptInput): string {
  const examples = selectExamples(input.query, 2).map((template) =>
    JSON.stringify(templateToEmitFormat(template), null, 2)
  );

  return `You design workflows for Dafthunk, a visual automation platform. Given a plain-English request, you produce a directed acyclic graph of nodes.

Return ONLY a JSON object matching the schema. No prose, no markdown fences.

# How graphs work

${COMPONENT_FAMILIES.node.purpose} An edge connects one node's output port to another node's input port. You reference nodes by an id you invent, and ports by their exact names from the catalog below.

You do NOT describe port shapes — only the node "type" and any literal "inputs" values. The server materializes the real ports from the registry.

# Type rules — these are enforced and are the most common cause of failure

Every edge is checked before the workflow can run. These are the rejections you
would be shown, in the words you would be shown them:

${describeTypeRules()}

# Rules

1. The graph must be acyclic.
2. Every node id must be unique.
3. Every required input must either receive an edge or carry a literal value in "inputs".
${describeDelivery(input.destination)}
5. Give input nodes realistic sample values so the first run produces a meaningful result.
6. Prefer, in order: plain compute nodes (text, json, math, logic, date); then a
   model node when the step needs judgement or generation; then "fetch" for
   arbitrary HTTP. The model nodes on offer, by the work they do:
${describeModelNodes(input.catalog)}
7. Build model prompts in their own template node ("var-string-template" with var_1, var_2, … or "json-string-template") rather than burying instructions in a default value.
8. Build the SMALLEST graph that does what was asked. Every node is something the
   user has to read, understand and maintain, and a step that does not change the
   result is pure cost. Before adding one, ask what the request would lose without
   it — if the answer is nothing, leave it out. In particular: do not add a node to
   reformat, trim or tidy text that a model node was already told to produce in
   that form; do not chain two model calls where one prompt would do; and do not
   add steps the request never asked for on the grounds that they might be useful.
   Fewer, clearer steps beat a thorough pipeline.
${describeAgentRule(input.nodeTypes)}

# Triggers

${COMPONENT_FAMILIES.trigger.purpose} Choose the one that matches how the request says the workflow starts ("when an email arrives" → email_message, "every morning" → scheduled, and so on). If it does not say, use "manual".

The trigger node is added by the server, with a fixed id. Do NOT emit trigger or response nodes yourself — wire to and from the ids below. One exception: where a line says a trigger is configurable, emit a node with the trigger's fixed id carrying only those "inputs"; the server merges the values onto its own trigger node. Everything else on a trigger is filled by the server.

${describeTriggerOptions(input.nodeTypes)}

# Test examples

Also emit "examples": up to ${MAX_GENERATED_EXAMPLES} named input sets the workflow
can be run against. The first one is executed as soon as the workflow is saved, so it must
be the ordinary case.

- Keep them minimal. One or two short sentences per value is enough — no long
  documents, no external URLs, no file, image or audio values.
- Give only the values that DIFFER from the literals you put on the nodes. The
  server fills in the rest from the graph, so an example that changes one field
  is one field long.
- Name each after what it exercises: "Urgent email", "Empty body", "Two items".
- "nodeValues" is keyed by your own node ids, then by input name.
- Put the simulated trigger payload in "trigger" — the workflow cannot be tested
  without it when the trigger carries one.

The shape, for a workflow whose input node is "article":

"examples": [
  { "name": "Short article", "nodeValues": { "article": { "value": "Rain is expected all week." } } },
  { "name": "Empty article", "nodeValues": { "article": { "value": "" } } }
]

${input.grounding ? `${projectGroundingForSynthesis(input.grounding)}\n` : ""}
${describeWithheld(input.withheld)}
${describeUnconnected(input.unconnectedProviders ?? [])}

# Available node types

${input.renderedCatalog ?? renderCatalog(input.catalog, input.nodeTypes)}

# Examples of correct output

These are shipped workflows, shown for node and edge shape. They carry no
"examples" field because they were built by hand; yours must still have one.

${examples.join("\n\n")}
`;
}

export function buildUserPrompt(query: string): string {
  return `Build a workflow for this request:\n\n${query}`;
}

/**
 * The draft itself is deliberately not repeated here — the model's own previous
 * message is already in the conversation, and restating it doubled the tokens
 * spent per repair round for no added signal.
 */
export function buildRepairPrompt(errors: string): string {
  return `The workflow you produced has errors:

${errors}

Return the COMPLETE corrected JSON object, not a patch and not only the changed parts. Keep everything that was already correct.`;
}

/**
 * The user has seen the result and said what is wrong with it.
 *
 * Unlike the two repair prompts, nothing here is a defect report — the workflow
 * may be perfectly well-formed and simply not what they meant. So the framing
 * is a change request, and the instruction to change the minimum is the load-
 * bearing part: they are correcting one thing, and a rewrite that quietly
 * discards the parts they liked reads as the tool ignoring them.
 */
export function buildCritiquePrompt(note: string): string {
  return `The workflow ran and the person who asked for it has seen the result. They say:

"${note}"

Change the workflow so that is true. Everything they did not mention is fine — change as little as possible. If the test inputs in "examples" are what made it look wrong, fix those instead of the graph.

Return the COMPLETE corrected JSON object, not a patch and not only the changed parts.`;
}

/**
 * Repair round for a graph that validated but failed when it ran.
 *
 * Says explicitly that the graph is well-formed, because the model's instinct
 * on seeing "errors" is to rewire ports that were never wrong. What broke is a
 * value, a prompt or a node choice.
 */
export function buildRunRepairPrompt(failures: string): string {
  return `The workflow is structurally valid and was saved, but running it failed:

${failures}

The connections are fine — do not rewire ports that were not named above. Look at what the failing node was given: a literal value it cannot accept, a prompt built wrongly, or a node that cannot do the job at all. If the input values in "examples" caused it, fix those too.

Return the COMPLETE corrected JSON object, not a patch and not only the changed parts. Keep everything that was already correct.`;
}

/**
 * Schema for the fast-tier early plan — the steps alone, nothing else.
 *
 * The synthesis model writes the real plan, but it cannot be streamed
 * (`callAgentLLM` is non-streaming across every provider), so it arrives only
 * when the whole draft returns — after the longest, emptiest stretch of the
 * first run. A parallel fast-tier call puts intended steps on screen seconds
 * in; the synthesis plan replaces them the moment it lands.
 */
export const EARLY_PLAN_SCHEMA = {
  type: "object",
  properties: {
    steps: {
      type: "array",
      items: { type: "string" },
      description: "3-6 steps, one short plain-language line each.",
    },
  },
  required: ["steps"],
} as const;

export const EARLY_PLAN_SYSTEM = `You preview the steps of an automation workflow that is being built right now. Answer with JSON only: {"steps": ["...", "..."]}.

Rules:
- 3 to 6 steps, each one short line in plain language, in execution order.
- Describe what each step does for the person, not which tool implements it.
- Never name a service or product the request itself does not name.
- No numbering, no punctuation at the start of a line.`;

export function buildEarlyPlanPrompt(request: string): string {
  return `The workflow being built: ${request}`;
}
