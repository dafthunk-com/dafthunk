import type { NodeType } from "@dafthunk/types";
import { TRIGGER_TO_NODE_TYPES } from "@dafthunk/utils";

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
  const hasSubscriptionGated = withheld.some(
    (w) => w.reason === "subscription"
  );

  const notes: string[] = [];
  if (providers.length) {
    notes.push(
      `These services are NOT connected in this workspace: ${providers.join(", ")}. If the request needs one, build the workflow up to that point, end that branch in an "output-text" node named after the intended action, and say so in "description". Never pretend the step happened.`
    );
  }
  if (hasSubscriptionGated) {
    notes.push(
      `Some premium nodes are unavailable on this plan and are absent from the catalog. Use the "ai-*" nodes for anything requiring a model.`
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
4. Every branch must end in an output node ("output-text", "output-json", "output-image", …) so the run shows the user something.
5. Give input nodes realistic sample values so the first run produces a meaningful result.
6. Prefer, in order: plain compute nodes (text, json, math, logic, date); the "ai-*" nodes for anything needing judgement, summarizing, classifying or drafting; "fetch" for arbitrary HTTP.
7. Build model prompts in their own template node ("var-string-template" with var_1, var_2, … or "json-string-template") rather than burying instructions in a default value.

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

${projectCatalog(input.catalog)}

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
