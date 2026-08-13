import { DEFAULT_MAX_STEPS } from "@dafthunk/runtime/nodes/agent/base-agent-node";
import type { Node, NodeType, Parameter, ToolReference } from "@dafthunk/types";

/**
 * Which nodes a generated agent may call, and how that choice reaches the graph.
 *
 * An agent node is the answer to a request the pipeline shape handles badly:
 * "read the top stories and summarize each" needs a different number of steps
 * depending on what the first step returns, and a static graph has to guess.
 * The loop also closes the failure this generator shipped — there is no
 * template string to wire past the model, because the tool result arrives in
 * the model's own context rather than on an edge somebody has to connect.
 *
 * What stops the model reaching for it is not capability but visibility.
 * `tools` is `hidden`, which the editor reads as "no handle on the canvas"
 * (tools are edited through their own panel) and the catalog projection reads
 * as "set by the server, never by the model". Those two meanings coincide for
 * `model` and `max_history`. They do not coincide here, and this module is the
 * narrow exception that lets one input be authored while staying off the
 * canvas.
 */

/** Tool references live here on every agent-loop node. */
/**
 * The literal shape of one tool reference, shown wherever one is asked for.
 *
 * Stated once because it is asked for twice: here, describing the port, and in
 * the `UNKNOWN_TOOL` repair message when an agent reached for something it
 * cannot use. Two hand-written copies of a JSON literal is two chances for the
 * repair round to teach a shape the port description contradicts.
 */
export const TOOL_REFERENCE_EXAMPLE = '[{"type":"node","identifier":"fetch"}]';

export const TOOLS_INPUT = "tools";

/** How many tool-call rounds the loop may take before it gives up. */
export const MAX_STEPS_INPUT = "max_steps";

/**
 * Rounds allowed when the agent has tools and the model said nothing.
 *
 * The node ships 10, which suits an agent that looks one thing up. It is a
 * step short for the shape these requests keep asking for — fetch a list, then
 * fetch each of ten things on it — and the failure is quiet: `finish_reason`
 * reads `max_steps_reached` and the answer covers the first eight items with
 * no sign the rest existed.
 */
export const TOOL_EQUIPPED_MAX_STEPS = 20;

/**
 * Whether a node type runs an agent loop.
 *
 * Structural rather than a `agent-` name test, and narrower than "declares
 * tools": the Gemini model nodes carry a `tools` input for single-round
 * function calling, and the email agent carries one too. `max_steps` is what
 * distinguishes a loop that can iterate, which is the thing being offered
 * here.
 */
export function isAgentNodeType(nodeType: NodeType): boolean {
  const names = new Set(nodeType.inputs.map((input) => input.name));
  return names.has(TOOLS_INPUT) && names.has(MAX_STEPS_INPUT);
}

/**
 * Parameter types a model can supply as JSON.
 *
 * A tool's arguments are written by the model as a JSON object, so a node
 * requiring a blob cannot be called by an agent however useful it looks.
 * `to-markdown` is the case that matters: it takes a `document`, so the
 * obvious "fetch a page, convert it, read it" chain is not available to an
 * agent and has to happen inside the tool result instead.
 */
const JSON_EXPRESSIBLE: ReadonlySet<string> = new Set([
  "string",
  "number",
  "boolean",
  "json",
  "date",
  "geojson",
  "any",
]);

/**
 * Node types offered to a generated agent, in the order they are shown.
 *
 * Hand-picked, and it has to stay that way: 197 node types declare
 * `asTool: true`, and a 30B model handed all of them chooses badly and burns
 * its steps doing it. Every shipped template that uses tools pins them the same
 * way.
 *
 * Two properties are required of anything added here, and `usableAsTool`
 * enforces both rather than trusting this comment: callable with JSON
 * arguments, and free of credentials or org-owned resources. The second is what
 * lets the list be a constant instead of something recomputed per org — a tool
 * needing a connected account would have to be withheld exactly as
 * `filterEligible` withholds nodes, and would leave an agent burning rounds on
 * a tool that cannot run.
 */
const ALLOWED_TOOL_TYPES: readonly string[] = [
  // Arbitrary HTTP, which is most of what these requests need.
  "fetch",
  // Lookup that needs no key and returns text rather than a document.
  "search-wikipedia",
  // Arithmetic, because models do it badly and this is the shipped example.
  "calculator",
  // "Every morning" workflows need to know which morning it is.
  "now-date",
];

/** Inputs a caller must supply: required, and not preset by the server. */
function callerSupplied(nodeType: NodeType): Parameter[] {
  return nodeType.inputs.filter((input) => input.required && !input.hidden);
}

/**
 * Whether an agent could actually call this node.
 *
 * A hidden required input is checked too, because the tool schema skips hidden
 * inputs entirely — so one with no default is a tool that always fails at
 * execution with a message the agent cannot act on.
 */
export function usableAsTool(nodeType: NodeType): boolean {
  if (nodeType.asTool !== true) return false;

  const unsatisfiableHidden = nodeType.inputs.some(
    (input) => input.hidden && input.required && input.value === undefined
  );
  if (unsatisfiableHidden) return false;

  return callerSupplied(nodeType).every((input) =>
    JSON_EXPRESSIBLE.has(input.type)
  );
}

/**
 * The allowlist narrowed to what this deployment can actually run.
 *
 * Roughly a fifth of node registrations sit behind env-var flags, so a type
 * named here may simply not exist — offering it would produce an agent whose
 * first tool call fails.
 */
export function agentToolCatalog(nodeTypes: NodeType[]): NodeType[] {
  const byType = new Map(
    nodeTypes.map((nodeType) => [nodeType.type, nodeType])
  );

  return ALLOWED_TOOL_TYPES.flatMap((type) => {
    const nodeType = byType.get(type);
    return nodeType && usableAsTool(nodeType) ? [nodeType] : [];
  });
}

/** The tool port, described for the prompt. */
export function describeAgentTools(tools: NodeType[]): string[] {
  if (tools.length === 0) return [];

  const options = tools
    .map((tool) => `"${tool.type}" (${tool.description ?? tool.name})`)
    .join(", ");

  return [
    `tools:json — node types this agent may call, as ${TOOL_REFERENCE_EXAMPLE}. Choose from: ${options}. Omit it for an agent that only reasons over what it is given.`,
    `${MAX_STEPS_INPUT}:number — tool-call rounds allowed before it stops (default ${TOOL_EQUIPPED_MAX_STEPS} once tools are set). Raise it when the task fans out over a list.`,
  ];
}

/**
 * Tool references recovered from whatever the model emitted.
 *
 * Three shapes are accepted, because all three turn up and only the first is
 * the documented one: the reference object, a bare type name, and the
 * `node_`-prefixed name the model sees in its own tool schema. Rejecting the
 * last two would spend a repair round on a spelling the model had every reason
 * to believe in.
 */
export function normalizeToolReferences(value: unknown): {
  references: ToolReference[];
  unreadable: string[];
} {
  const raw = typeof value === "string" ? parseJsonish(value) : value;
  if (!Array.isArray(raw)) {
    return { references: [], unreadable: [] };
  }

  const references: ToolReference[] = [];
  const unreadable: string[] = [];

  for (const entry of raw) {
    const identifier = readIdentifier(entry);
    if (identifier === undefined) {
      unreadable.push(describeEntry(entry));
      continue;
    }
    references.push({ type: "node", identifier });
  }

  return { references, unreadable };
}

function parseJsonish(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function readIdentifier(entry: unknown): string | undefined {
  if (typeof entry === "string") return stripToolPrefix(entry);

  if (entry && typeof entry === "object") {
    const candidate = (entry as { identifier?: unknown }).identifier;
    if (typeof candidate === "string") return stripToolPrefix(candidate);
  }

  return undefined;
}

/** `node_fetch` is what the agent sees at run time; `fetch` is what it is. */
function stripToolPrefix(identifier: string): string {
  const trimmed = identifier.trim();
  return trimmed.startsWith("node_") ? trimmed.slice("node_".length) : trimmed;
}

function describeEntry(entry: unknown): string {
  if (entry === null) return "null";
  if (typeof entry === "object") return JSON.stringify(entry);
  return String(entry);
}

export interface AppliedAgentTools {
  /** References kept, after dropping everything not on the allowlist. */
  kept: ToolReference[];
  /** Identifiers asked for and refused, for the message that says so. */
  rejected: string[];
}

/**
 * Settles a single agent node's tools, in place on the node's inputs.
 *
 * Rejected references are removed rather than left to fail at run time, and
 * returned so the caller can say what happened. Silently dropping them would
 * reproduce the failure `filterEligible` exists to prevent, one layer down: a
 * capability that vanishes without explanation reads as the product ignoring
 * the request.
 */
export function applyAgentTools(
  node: Node,
  allowed: ReadonlySet<string>
): AppliedAgentTools {
  const toolsInput = node.inputs.find((input) => input.name === TOOLS_INPUT);
  if (!toolsInput) return { kept: [], rejected: [] };

  const { references, unreadable } = normalizeToolReferences(toolsInput.value);

  const kept: ToolReference[] = [];
  const rejected: string[] = [...unreadable];
  const seen = new Set<string>();

  for (const reference of references) {
    if (!allowed.has(reference.identifier)) {
      rejected.push(reference.identifier);
      continue;
    }
    if (seen.has(reference.identifier)) continue;
    seen.add(reference.identifier);
    kept.push(reference);
  }

  toolsInput.value = kept;

  // Only when the model left the ceiling alone. A number it chose is a
  // decision about this workflow and outranks the default for tool use.
  if (kept.length > 0) {
    const maxSteps = node.inputs.find(
      (input) => input.name === MAX_STEPS_INPUT
    );
    if (maxSteps && !wasChosen(maxSteps)) {
      maxSteps.value = TOOL_EQUIPPED_MAX_STEPS;
    }
  }

  return { kept, rejected };
}

/**
 * Whether a value on an input came from the model rather than the registry.
 *
 * The registry default arrives on the node as a value like any other, so the
 * only thing distinguishing "the model chose 10" from "nobody touched it" is
 * that the second equals the shipped default.
 */
function wasChosen(input: Parameter): boolean {
  return (
    typeof input.value === "number" && input.value !== DEFAULT_AGENT_MAX_STEPS
  );
}

/**
 * What `base-agent-node.ts` ships as the `max_steps` default.
 *
 * Imported rather than restated. The node declared 10 in its parameter list,
 * defaulted to 10 again when executing, and this file held a third copy whose
 * comment admitted as much — three numbers that had to agree with nothing
 * making them.
 */
const DEFAULT_AGENT_MAX_STEPS = DEFAULT_MAX_STEPS;
