import type { Node, WorkflowTemplate } from "@dafthunk/types";

import { workflowTemplates } from "../../templates";
import type { DraftNode, GeneratedWorkflowDraft } from "./draft-types";
import { scoreNodeTypes } from "./node-search";

/**
 * Shipped templates, reused as few-shot examples.
 *
 * They are the only hand-verified graphs in the codebase, so they teach the
 * model the house style — build the prompt in its own template node, terminate
 * in an output node — far better than prose can. They are projected into the
 * generator's own emit format first: if the examples disagree with the schema,
 * the model follows the examples.
 */

/**
 * What a template's text generation is shown as.
 *
 * The templates pin Workers AI models, and the catalog no longer offers one for
 * text — so the examples have to demonstrate the agent node instead. This is
 * the reason the projection cannot be a straight type swap: the two nodes name
 * their ports differently, and an example that teaches `prompt`/`response` for
 * a node with `input`/`text` is worse than no example, because the model
 * follows the examples over the schema.
 */
const AGENT_TEXT_TYPE = "agent-claude-sonnet-4";

/** Port names on a Workers AI text node, and their agent equivalents. */
const MODEL_PROMPT = "prompt";
const MODEL_RESPONSE = "response";
const AGENT_INPUT = "input";
const AGENT_TEXT = "text";

/**
 * The Workers AI text-generation shape: one instruction in, one string out.
 *
 * Decided from the node's ports rather than its model identifier, which is the
 * correction that matters here. Guessing from the name and falling through to
 * a text stand-in quietly relabelled every model it did not recognise —
 * translation (`text`/`source_lang` → `translated_text`), captioning, and
 * text-to-speech all became "text generation" while keeping ports the stand-in
 * never had. That survived only because pseudo types are rebuilt from their own
 * declarations at hydration, discarding the wrong names; pointing the same
 * projection at a real registry node turned it fatal, and every node in the
 * example was dropped as unknown.
 */
function isTextGeneration(node: Node): boolean {
  const inputs = new Set(node.inputs.map((i) => i.name));
  const outputs = new Set((node.outputs ?? []).map((o) => o.name));
  return inputs.has(MODEL_PROMPT) && outputs.has(MODEL_RESPONSE);
}

/**
 * The type a pinned Workers AI model stands in for, or `undefined` when the
 * catalog has nothing that can represent it.
 */
function standInTypeForModel(node: Node): string | undefined {
  const model = node.inputs.find((i) => i.name === "model")?.value;
  if (typeof model === "string") {
    if (model.includes("whisper")) return "ai-transcribe";
    if (model.includes("flux") || model.includes("stable-diffusion")) {
      return "ai-image";
    }
  }
  return isTextGeneration(node) ? AGENT_TEXT_TYPE : undefined;
}

/**
 * Whether every pinned model in a template has a stand-in.
 *
 * A template that fails this cannot be shown as an example at all: there is no
 * catalog type for the node, so any graph copied from it names something that
 * does not exist. Losing an example is the smaller harm — the model follows
 * examples over the schema, so a broken one is worse than none.
 */
export function isProjectable(template: WorkflowTemplate): boolean {
  return template.nodes.every(
    (node) =>
      node.type !== "cloudflare-model" ||
      standInTypeForModel(node) !== undefined
  );
}

/** Literal input values, minus hidden plumbing the model never supplies. */
function draftInputs(node: Node): Record<string, unknown> | undefined {
  const entries: Record<string, unknown> = {};
  for (const input of node.inputs) {
    if (input.hidden) continue;
    if (input.value === undefined) continue;
    entries[input.name] = input.value;
  }
  return Object.keys(entries).length ? entries : undefined;
}

/** `prompt` carries the instruction on both nodes; the agent calls it `input`. */
function renamePromptInput(
  inputs: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!inputs || !(MODEL_PROMPT in inputs)) return inputs;
  const { [MODEL_PROMPT]: prompt, ...rest } = inputs;
  return { ...rest, [AGENT_INPUT]: prompt };
}

export function templateToEmitFormat(
  template: WorkflowTemplate
): GeneratedWorkflowDraft {
  // Which nodes became agents, so the edges touching them can be renamed too.
  // An edge still pointing at `prompt` would validate against nothing.
  const asAgent = new Set<string>();

  const nodes: DraftNode[] = template.nodes.map((node) => {
    const type =
      node.type === "cloudflare-model"
        ? // Unreachable for templates that passed `isProjectable`, which is how
          // they are selected; kept total rather than throwing here.
          (standInTypeForModel(node) ?? node.type)
        : node.type;
    if (type === AGENT_TEXT_TYPE) asAgent.add(node.id);

    return {
      id: node.id,
      type,
      name: node.name,
      inputs:
        type === AGENT_TEXT_TYPE
          ? renamePromptInput(draftInputs(node))
          : draftInputs(node),
    };
  });

  return {
    title: template.name,
    description: template.description,
    trigger: template.trigger,
    steps: [],
    nodes,
    edges: template.edges.map((edge) => ({
      ...edge,
      ...(asAgent.has(edge.target) &&
        edge.targetInput === MODEL_PROMPT && { targetInput: AGENT_INPUT }),
      ...(asAgent.has(edge.source) &&
        edge.sourceOutput === MODEL_RESPONSE && { sourceOutput: AGENT_TEXT }),
    })),
  };
}

/**
 * Templates that genuinely score against the request — possibly none.
 *
 * Kept separate from `selectExamples` because the two callers want opposite
 * things from a request that matches nothing. Prompting wants an example
 * regardless; anything shown to a *person* as "did you mean" needs to know
 * that there was no match, so it can stop pretending it understood.
 */
export function rankExamples(query: string, limit: number): WorkflowTemplate[] {
  if (limit <= 0) return [];

  const asNodeTypes = workflowTemplates
    .filter(isProjectable)
    .map((template) => ({
      id: template.id,
      name: template.name,
      type: template.id,
      description: template.description,
      tags: [...template.tags, ...template.nodes.map((n) => n.type)],
      icon: template.icon,
      inputs: [],
      outputs: [],
    }));

  return scoreNodeTypes(query, asNodeTypes)
    .slice(0, limit)
    .map((scored) =>
      workflowTemplates.find((t) => t.id === scored.nodeType.type)
    )
    .filter((t): t is WorkflowTemplate => t !== undefined);
}

/**
 * Picks the templates closest to the request, never returning none. Scoring
 * reuses the node-search ranker by treating each template as a pseudo node type
 * built from its name, description, tags and the node types it uses.
 */
export function selectExamples(
  query: string,
  limit: number
): WorkflowTemplate[] {
  const ranked = rankExamples(query, limit);
  if (ranked.length > 0) return ranked;

  // Always ship at least one example; a request that matches nothing is exactly
  // when the model most needs to see the expected shape. Both candidates go
  // through `isProjectable` — an unprojectable fallback would put a broken
  // example in front of precisely the requests that had nothing else to go on.
  if (limit <= 0) return [];
  const projectable = workflowTemplates.filter(isProjectable);
  const fallback = projectable.find((t) => t.id === "text-summarization");
  return fallback ? [fallback] : projectable.slice(0, 1);
}
