import { isObjectReference, isRuntimeValue } from "@dafthunk/runtime";
import type { Workflow, WorkflowExample } from "@dafthunk/types";
import { NON_LITERAL_PARAMETER_TYPES } from "@dafthunk/utils";

import { extractNodeValues } from "../../utils/example-inputs";
import { MAX_EXAMPLE_VALUE_CHARS, MAX_GENERATED_EXAMPLES } from "./config";
import type { DraftExample, GeneratedWorkflowDraft } from "./draft-types";

/**
 * Turns the model's test inputs into examples the workflow can be run against.
 *
 * The model emits a diff — only the values that differ from the literals it put
 * on the nodes — and each example is completed here from the graph. That is why
 * no per-type placeholder table is needed: `MISSING_REQUIRED_INPUT` is fatal, so
 * by the time a graph reaches this point every required unconnected input
 * already carries a literal, and the union covers whatever the model left out.
 */

type NodeValues = Record<string, Record<string, unknown>>;

/** Names and descriptions are held to what `POST /examples` would accept. */
const MAX_NAME_CHARS = 100;
const MAX_DESCRIPTION_CHARS = 500;

/**
 * Whether a model-supplied value can be stored as-is.
 *
 * Object references are refused: the model has no way to know the id of an
 * object that exists, so anything reference-shaped it emits points at nothing
 * and would fail at run time with a far worse message than a missing value.
 */
function isStorableValue(value: unknown): boolean {
  return isRuntimeValue(value) && !isObjectReference(value);
}

/** Truncates an oversized string, drops any other value that exceeds the cap. */
function capValue(value: unknown): unknown | undefined {
  if (typeof value === "string") {
    return value.length > MAX_EXAMPLE_VALUE_CHARS
      ? value.slice(0, MAX_EXAMPLE_VALUE_CHARS)
      : value;
  }
  if (typeof value !== "object" || value === null) return value;
  return JSON.stringify(value).length > MAX_EXAMPLE_VALUE_CHARS
    ? undefined
    : value;
}

/**
 * Keeps only the values that name a real, settable input on this graph.
 *
 * The same three cases `buildInputOverrides` drops at execution time are dropped
 * here instead, so a value that could never take effect is not stored in the
 * first place: the node is gone, the input is not declared, or the input is fed
 * by an edge (an edge always beats a literal).
 */
function sanitizeNodeValues(
  values: Record<string, Record<string, unknown>> | undefined,
  workflow: Pick<Workflow, "nodes" | "edges">
): NodeValues {
  if (!values || typeof values !== "object") return {};

  const nodesById = new Map(workflow.nodes.map((node) => [node.id, node]));
  const connected = new Set(
    workflow.edges.map((edge) => `${edge.target}:${edge.targetInput}`)
  );

  const sanitized: NodeValues = {};

  for (const [nodeId, inputs] of Object.entries(values)) {
    const node = nodesById.get(nodeId);
    if (!node || !inputs || typeof inputs !== "object") continue;

    for (const [inputName, raw] of Object.entries(inputs)) {
      const input = node.inputs.find(
        (parameter) => parameter.name === inputName
      );
      if (!input) continue;
      if (NON_LITERAL_PARAMETER_TYPES.has(input.type)) continue;
      if (connected.has(`${nodeId}:${inputName}`)) continue;
      if (!isStorableValue(raw)) continue;

      const value = capValue(raw);
      if (value === undefined) continue;

      sanitized[nodeId] ??= {};
      sanitized[nodeId][inputName] = value;
    }
  }

  return sanitized;
}

/** Graph literals first, then the example's own values over the top. */
function merge(base: NodeValues, overrides: NodeValues): NodeValues {
  const merged: NodeValues = {};
  for (const [nodeId, inputs] of Object.entries(base)) {
    merged[nodeId] = { ...inputs };
  }
  for (const [nodeId, inputs] of Object.entries(overrides)) {
    merged[nodeId] = { ...merged[nodeId], ...inputs };
  }
  return merged;
}

/** Trigger payloads are freeform, so only their size is policed. */
function sanitizeTrigger(
  trigger: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!trigger || typeof trigger !== "object") return undefined;

  const sanitized: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(trigger)) {
    const value = capValue(raw);
    if (value !== undefined) sanitized[key] = value;
  }
  return Object.keys(sanitized).length ? sanitized : undefined;
}

function text(value: unknown, limit: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, limit);
}

/** Names are the handle the user picks an example by, so they must differ. */
function uniqueName(name: string, taken: Set<string>): string {
  if (!taken.has(name)) return name;
  for (let suffix = 2; ; suffix++) {
    const candidate = `${name} ${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * The example every generated workflow gets when the model emitted none: the
 * graph's own values, which is what the first run used before examples existed.
 */
function fallbackExample(draft: GeneratedWorkflowDraft): DraftExample {
  return {
    name: "Generated sample",
    description: "Input values produced when this workflow was generated.",
    trigger: draft.sampleTrigger,
  };
}

export function buildGeneratedExamples(
  draft: GeneratedWorkflowDraft,
  workflow: Pick<Workflow, "nodes" | "edges">
): WorkflowExample[] {
  const base = extractNodeValues(workflow);

  const drafted = (draft.examples ?? [])
    .filter(
      (example): example is DraftExample =>
        Boolean(example) && typeof example === "object"
    )
    .slice(0, MAX_GENERATED_EXAMPLES);

  const source = drafted.length ? drafted : [fallbackExample(draft)];
  const taken = new Set<string>();
  const now = new Date();

  return source.map((example, index) => {
    const name = uniqueName(
      text(example.name, MAX_NAME_CHARS) ?? `Example ${index + 1}`,
      taken
    );
    taken.add(name);

    return {
      id: crypto.randomUUID(),
      name,
      description: text(example.description, MAX_DESCRIPTION_CHARS),
      // The first is the one the generation run executes, and the one Run falls
      // back to afterwards.
      isDefault: index === 0,
      nodeValues: merge(base, sanitizeNodeValues(example.nodeValues, workflow)),
      trigger: sanitizeTrigger(example.trigger ?? draft.sampleTrigger),
      createdAt: now,
      updatedAt: now,
    };
  });
}
