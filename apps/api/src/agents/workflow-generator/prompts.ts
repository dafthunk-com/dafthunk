import type { BriefDestination, NodeType } from "@dafthunk/types";
import { TRIGGER_TO_NODE_TYPES } from "@dafthunk/utils";

import { agentToolCatalog } from "./agent-tools";
import { projectCatalog } from "./catalog-projection";
import type { Ineligible } from "./eligibility";
import { withheldProviders } from "./eligibility";
import { RESPONDER_NODE_ID, TRIGGER_NODE_ID } from "./hydrate";
import { selectExamples, templateToEmitFormat } from "./template-examples";

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
      enum: [
        "manual",
        "http_webhook",
        "http_request",
        "form_webhook",
        "form_request",
        "email_message",
        "queue_message",
        "scheduled",
        "discord_event",
        "telegram_event",
        "whatsapp_event",
        "slack_event",
      ],
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
      description:
        "Two or three named test inputs. The first one is executed once the workflow is saved.",
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
            description:
              "Simulated trigger payload. email_message: {from, subject, body}. http_*: {method, query, jsonBody}. form_*: {formRecord}. Omit for other triggers.",
          },
        },
      },
    },
  },
} as const;

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

  const lines: string[] = [
    `- "manual": no trigger node. Start from input nodes carrying realistic sample values.`,
  ];

  for (const [trigger, typeIds] of Object.entries(TRIGGER_TO_NODE_TYPES)) {
    if (trigger === "manual" || typeIds.length === 0) continue;

    const triggerType = byType.get(typeIds[0]);
    if (!triggerType) continue;

    let line = `- "${trigger}": adds node id "${TRIGGER_NODE_ID}" (type ${triggerType.type}) with outputs ${ports(triggerType.outputs)}`;

    const responderType = typeIds[1] ? byType.get(typeIds[1]) : undefined;
    if (responderType) {
      line += `, plus node id "${RESPONDER_NODE_ID}" (type ${responderType.type}) with inputs ${ports(responderType.inputs)}. You MUST wire exactly one edge into "${RESPONDER_NODE_ID}" — it is what the caller receives`;
    }

    lines.push(`${line}.`);
  }

  return lines.join("\n");
}

function describeWithheld(withheld: Ineligible[]): string {
  const providers = withheldProviders(withheld);

  const notes: string[] = [];
  if (providers.length) {
    notes.push(
      `These services are NOT connected in this workspace: ${providers.join(", ")}. If the request needs one, build the workflow up to that point, end that branch in an "output-text" node named after the intended action, and say so in "description". Never pretend the step happened.`
    );
  }
  return notes.join("\n");
}

export interface SystemPromptInput {
  catalog: NodeType[];
  /** Full registry, used to describe the trigger nodes the server injects. */
  nodeTypes: NodeType[];
  withheld: Ineligible[];
  query: string;
  /**
   * What the brief committed to delivering, when there was a brief.
   *
   * `DESTINATION_NOT_REALIZED` is the backstop for this, but a backstop costs a
   * whole repair round every time it fires. Stating the requirement up front is
   * what keeps that check from being the mechanism.
   */
  destination?: BriefDestination;
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

A node has typed input and output ports. An edge connects one node's output port to another node's input port. You reference nodes by an id you invent, and ports by their exact names from the catalog below.

You do NOT describe port shapes — only the node "type" and any literal "inputs" values. The server materializes the real ports from the registry.

# Type rules — these are enforced and are the most common cause of failure

- Types must match exactly, OR one side must be "any".
- "any" is a wildcard in both directions.
- "json" is NOT a wildcard. json -> string is REJECTED. Use a "to-string" node, or "json-extract-string" to pull out a field.
- There is no coercion. number -> string and boolean -> string are both REJECTED.
- "blob" pairs with image, audio, video, document, gltf, buffergeometry in either direction. But image -> audio is REJECTED; two blob flavours never connect directly.

# Rules

1. The graph must be acyclic.
2. Every node id must be unique.
3. Every required input must either receive an edge or carry a literal value in "inputs".
${describeDelivery(input.destination)}
5. Give input nodes realistic sample values so the first run produces a meaningful result.
6. Prefer, in order: plain compute nodes (text, json, math, logic, date); the "ai-*" nodes for anything needing judgement, summarizing, classifying or drafting; "fetch" for arbitrary HTTP.
7. Build model prompts in their own template node ("var-string-template" with var_1, var_2, … or "json-string-template") rather than burying instructions in a default value.
8. Build the SMALLEST graph that does what was asked. Every node is something the
   user has to read, understand and maintain, and a step that does not change the
   result is pure cost. Before adding one, ask what the request would lose without
   it — if the answer is nothing, leave it out. In particular: do not add a node to
   reformat, trim or tidy text that an "ai-*" node was already told to produce in
   that form; do not chain two model calls where one prompt would do; and do not
   add steps the request never asked for on the grounds that they might be useful.
   Fewer, clearer steps beat a thorough pipeline.
9. Use an "agent-*" node, with "tools" set, when the number of steps depends on
   what an earlier step returns — "read the top stories and summarize each one"
   fans out over a list whose length nobody knows while drawing the graph, and a
   fixed chain of nodes has to guess at it. Give the agent the tools it needs and
   say the whole task in its "input". For work whose shape is known in advance,
   an "ai-*" node in a plain pipeline is cheaper and easier to read — prefer it.

# Triggers

Choose the trigger that matches how the request says the workflow starts ("when an email arrives" → email_message, "every morning" → scheduled, and so on). If it does not say, use "manual".

The trigger node is added by the server, with a fixed id. Do NOT emit trigger or response nodes yourself — wire to and from the ids below.

${describeTriggerOptions(input.nodeTypes)}

# Test examples

Also emit "examples": two or three named input sets the workflow can be run
against. The first one is executed as soon as the workflow is saved, so it must
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

${describeWithheld(input.withheld)}

# Available node types

${projectCatalog(input.catalog, { agentTools: agentToolCatalog(input.nodeTypes) })}

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
 * Correction after the user refused to let the workflow run.
 *
 * Distinct from a critique because the trigger is different: they have not
 * seen a result, they have seen what the workflow was about to *do* and said
 * no. So the instruction is about the act, and the reason usually names a
 * destination, a recipient or an audience that should not have been there.
 */
export function buildDeclinePrompt(reason: string): string {
  return `The workflow was built and saved but NOT run. Before running it, the person who asked for it was shown the steps that would act outside Dafthunk — sending, posting or messaging — and they refused. They say:

"${reason}"

Change the workflow so that objection no longer applies.

The correction is a REMOVAL, not an addition. Adding an output node beside the step they objected to does not answer them — the step they refused is still there and would still run. Delete it.

- Objecting to it being sent or posted at all: delete that node and every edge into it, and end the workflow at an output node instead.
- Objecting to where it goes: delete that node and put the destination they named in its place. Do not keep both.
- Objecting to what it would say: keep the destination and change the steps that produce the text.

Everything they did not mention is fine — change as little as possible.

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
