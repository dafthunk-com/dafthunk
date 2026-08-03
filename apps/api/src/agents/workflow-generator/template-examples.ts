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

/** The pseudo type a pinned Workers AI model stands in for. */
function pseudoTypeForModel(node: Node): string | undefined {
  const model = node.inputs.find((i) => i.name === "model")?.value;
  if (typeof model !== "string") return "ai-text";
  if (model.includes("whisper")) return "ai-transcribe";
  if (model.includes("flux") || model.includes("stable-diffusion")) {
    return "ai-image";
  }
  return "ai-text";
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

export function templateToEmitFormat(
  template: WorkflowTemplate
): GeneratedWorkflowDraft {
  const nodes: DraftNode[] = template.nodes.map((node) => ({
    id: node.id,
    type:
      node.type === "cloudflare-model"
        ? (pseudoTypeForModel(node) ?? "ai-text")
        : node.type,
    name: node.name,
    inputs: draftInputs(node),
  }));

  return {
    title: template.name,
    description: template.description,
    trigger: template.trigger,
    steps: [],
    nodes,
    edges: template.edges.map((edge) => ({ ...edge })),
  };
}

/**
 * Picks the templates closest to the request. Scoring reuses the node-search
 * ranker by treating each template as a pseudo node type built from its name,
 * description, tags and the node types it uses.
 */
export function selectExamples(
  query: string,
  limit: number
): WorkflowTemplate[] {
  if (limit <= 0) return [];

  const asNodeTypes = workflowTemplates.map((template) => ({
    id: template.id,
    name: template.name,
    type: template.id,
    description: template.description,
    tags: [...template.tags, ...template.nodes.map((n) => n.type)],
    icon: template.icon,
    inputs: [],
    outputs: [],
  }));

  const ranked = scoreNodeTypes(query, asNodeTypes)
    .slice(0, limit)
    .map((scored) =>
      workflowTemplates.find((t) => t.id === scored.nodeType.type)
    )
    .filter((t): t is WorkflowTemplate => t !== undefined);

  // Always ship at least one example; a request that matches nothing is exactly
  // when the model most needs to see the expected shape.
  if (ranked.length === 0) {
    const fallback = workflowTemplates.find(
      (t) => t.id === "text-summarization"
    );
    return fallback ? [fallback] : workflowTemplates.slice(0, 1);
  }

  return ranked;
}
