import { validateWorkflow } from "@dafthunk/runtime";
import type {
  BriefDestination,
  Node,
  NodeType,
  Parameter,
  Workflow,
} from "@dafthunk/types";
import { areTypesCompatible, explainIncompatibility } from "@dafthunk/utils";

import type { EnrichedValidationError } from "./draft-types";
import { RESPONDER_NODE_ID, TRIGGER_NODE_ID } from "./hydrate";

/**
 * Turns validation output into something a model can act on.
 *
 * `validateWorkflow` reports `INVALID_CONNECTION` with the message "Invalid
 * parameter reference in connection" and only the two node ids — which end was
 * wrong, and what the valid options were, are both absent. Feeding that back
 * verbatim wastes a repair round. Everything here exists to answer "which port,
 * and what should it have been" precisely enough to fix in one pass.
 */

function describePorts(parameters: Parameter[]): string {
  if (parameters.length === 0) return "(none)";
  return parameters.map((p) => `${p.name}:${p.type}`).join(", ");
}

function compatiblePorts(
  parameters: Parameter[],
  otherType: string,
  direction: "source" | "target"
): string {
  const usable = parameters.filter((p) =>
    direction === "source"
      ? areTypesCompatible(p.type, otherType)
      : areTypesCompatible(otherType, p.type)
  );
  return usable.length ? describePorts(usable) : "(none compatible)";
}

/**
 * Inputs where the node needs *one of* several, which ports cannot express.
 *
 * `send-email` marks both `html` and `text` optional because either will do,
 * so a graph can satisfy every port rule and still fail at run time with "at
 * least one of 'html' or 'text' must be provided". Encoding it here catches it
 * in a repair round instead — and unlike a bespoke narrower node, it protects
 * hand-authored workflows too.
 */
/**
 * Every browser node shares one requirement through `browser-rendering-api`:
 * a page to work on, given as either a URL or literal HTML. Neither input is
 * marked `required`, because either will do — which meant a generated scrape
 * node with neither passed validation cleanly and failed at run time with
 * "Either 'url' or 'html' is required". Listed explicitly rather than inferred
 * from "has both a url and an html input", because that shape is a coincidence
 * in any other node and guessing at it would invent requirements.
 */
const BROWSER_PAGE_SOURCE_NODES = [
  "cloudflare-browser-content",
  "cloudflare-browser-json",
  "cloudflare-browser-links",
  "cloudflare-browser-markdown",
  "cloudflare-browser-pdf",
  "cloudflare-browser-scrape",
  "cloudflare-browser-screenshot",
  "cloudflare-browser-snapshot",
];

const ONE_OF_INPUTS: Record<string, string[]> = {
  "send-email": ["html", "text"],
  ...Object.fromEntries(
    BROWSER_PAGE_SOURCE_NODES.map((type) => [type, ["url", "html"]])
  ),
};

/**
 * Whether an input actually carries something the node can use.
 *
 * `!== undefined` is not enough. An empty string is a value by that test and
 * nothing at all by every other one, so a `send-email` with `to: ""` validated
 * clean and then failed the run with "'to' and 'subject' are required".
 */
function hasUsableValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export interface ValidationContext {
  /**
   * What the brief committed to delivering. Absent for a generation that never
   * had a brief, in which case nothing below changes.
   */
  destination?: BriefDestination;
}

/**
 * Where the workflow's result belongs, when it is not the first required input.
 *
 * `send-email` requires `to` before anything else, so guessing by position
 * would tell the model to wire a summary into the recipient field. The body is
 * what carries the result, and it is optional-by-position precisely because
 * either `text` or `html` will do.
 */
const RESULT_INPUT: Record<string, string> = {
  "send-email": "text",
};

/** The input to wire the result into, for advice that is worth following. */
function resultInputName(
  nodeType: NodeType | undefined
): { name: string; type: string } | undefined {
  if (!nodeType) return undefined;

  const named = RESULT_INPUT[nodeType.type];
  const input = named
    ? nodeType.inputs.find((p) => p.name === named)
    : nodeType.inputs.find((p) => p.required && !p.hidden);

  return input ? { name: input.name, type: input.type } : undefined;
}

/**
 * Checks that the graph actually delivers what the brief promised.
 *
 * This is the one failure the rest of validation cannot see. "Every branch ends
 * in an output node" is already a rule, and a workflow that classifies an email
 * and drops the verdict into a text widget satisfies it completely — which is
 * exactly how "triage my email and tell me what's urgent" came to produce
 * something that triaged and told nobody. A promise the user confirmed is a
 * structural requirement, so it is checked structurally.
 */
function checkDestination(
  workflow: Workflow,
  nodeTypes: NodeType[],
  destination: BriefDestination
): EnrichedValidationError | undefined {
  const realized = workflow.nodes.filter((node) =>
    destination.nodeTypes.includes(node.type)
  );

  const preferred = destination.nodeTypes[0];
  const port = resultInputName(
    nodeTypes.find((nodeType) => nodeType.type === preferred)
  );
  const where = port ? `its "${port.name}" input` : "its input";

  if (realized.length === 0) {
    return {
      code: "DESTINATION_NOT_REALIZED",
      severity: "fatal",
      message: `Nothing in the workflow will ${destination.label}.`,
      fix: `The workflow must ${destination.label}, but no node does that. Add a node of type "${preferred}" and wire the final result into ${where}. A branch that only computes a value delivers nothing. Keep everything else exactly as it is.`,
    };
  }

  // A delivery node with no incoming edge is the subtler half of the same
  // mistake: the model added the right node and then left it dangling.
  const fed = realized.filter((node) =>
    workflow.edges.some((edge) => edge.target === node.id)
  );
  if (fed.length === 0) {
    const node = realized[0];
    const nodePort = resultInputName(
      nodeTypes.find((nodeType) => nodeType.type === node.type)
    );
    return {
      code: "DESTINATION_NOT_REALIZED",
      severity: "fatal",
      message: `"${node.id}" would ${destination.label} but has nothing to send.`,
      fix: `Node "${node.id}" (type ${node.type}) has no incoming edge, so it delivers nothing. Wire the result of the workflow into ${
        nodePort ? `its "${nodePort.name}" input` : "its input"
      }.`,
      nodeId: node.id,
    };
  }

  return undefined;
}

export function enrichValidation(
  workflow: Workflow,
  nodeTypes: NodeType[],
  extra: EnrichedValidationError[] = [],
  context: ValidationContext = {}
): EnrichedValidationError[] {
  const errors: EnrichedValidationError[] = [...extra];
  const byId = new Map<string, Node>(workflow.nodes.map((n) => [n.id, n]));

  /**
   * A generated workflow with no nodes has failed, whatever else validates.
   *
   * `EMPTY_WORKFLOW` has been in this module's vocabulary — code, severity and
   * repair instruction — while nothing could emit it. Every rule here and in
   * `validateWorkflow` iterates nodes or edges, so a graph with neither
   * produced no findings at all: the pipeline saved it, ran it (a run with
   * nothing to run completes immediately) and reported success having delivered
   * nothing. Two evaluation cases failed this way with `outcome=ok nodes=0`,
   * which reads as a delivery problem and is not one.
   *
   * Not pushed down into `validateWorkflow`, deliberately. That gates the
   * create and update endpoints, where an empty graph is a blank canvas
   * somebody is still drawing on. The asymmetry is the point: a person may
   * save nothing, a generator may not return it.
   *
   * Counted over what the model contributed *and* whether anything is wired,
   * not over node count alone. The trigger and responder are injected by
   * `hydrate` whatever the draft says, so a draft naming no nodes at all
   * arrives here as a one-node graph on every trigger that injects one — past
   * a `length === 0` guard, past every other rule (all of which iterate edges),
   * saved, run, and reported as a success. The benchmark caught it as a queue
   * workflow that validated clean at one node and zero edges.
   *
   * Both halves are load-bearing. An echo endpoint is a legitimate workflow
   * made of nothing but the two injected nodes and the edge between them —
   * `http-echo` is a shipped template of exactly that shape — so "the model
   * contributed no nodes" cannot be the test on its own. What the stub has and
   * the echo does not is no edges: nothing reaches anything.
   *
   * Returned alone. Every other check is vacuously satisfied by an empty graph,
   * so anything reported beside this would be noise in the repair prompt.
   */
  const contributed = workflow.nodes.filter(
    (node) => node.id !== TRIGGER_NODE_ID && node.id !== RESPONDER_NODE_ID
  );
  if (contributed.length === 0 && workflow.edges.length === 0) {
    const message =
      workflow.nodes.length === 0
        ? "The workflow has no nodes."
        : "The workflow contains only the injected trigger, wired to nothing.";
    return [
      {
        code: "EMPTY_WORKFLOW",
        severity: "fatal",
        message,
        fix: fixForStructuralError("EMPTY_WORKFLOW", message),
      },
    ];
  }

  // Port-level detail for every edge, derived independently of the base
  // validator so we can say which side was wrong.
  for (const edge of workflow.edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) continue;

    const output = source.outputs.find((o) => o.name === edge.sourceOutput);
    const input = target.inputs.find((i) => i.name === edge.targetInput);

    if (!output) {
      errors.push({
        code: "UNKNOWN_OUTPUT_PORT",
        severity: "fatal",
        message: `Node "${source.id}" has no output "${edge.sourceOutput}".`,
        fix: `Node "${source.id}" (type ${source.type}) has no output named "${edge.sourceOutput}". Its outputs are: ${describePorts(source.outputs)}. Use one of those as sourceOutput.`,
        nodeId: source.id,
        edge,
      });
      continue;
    }

    if (!input) {
      errors.push({
        code: "UNKNOWN_INPUT_PORT",
        severity: "fatal",
        message: `Node "${target.id}" has no input "${edge.targetInput}".`,
        fix: `Node "${target.id}" (type ${target.type}) has no input named "${edge.targetInput}". Its inputs are: ${describePorts(target.inputs)}. Use one of those as targetInput.`,
        nodeId: target.id,
        edge,
      });
      continue;
    }

    if (!areTypesCompatible(output.type, input.type)) {
      const why = explainIncompatibility(output.type, input.type);
      errors.push({
        code: "TYPE_MISMATCH",
        severity: "fatal",
        message: `${source.id}.${output.name} (${output.type}) cannot connect to ${target.id}.${input.name} (${input.type}).`,
        fix: `${why} Outputs on "${source.id}" that would fit "${input.name}": ${compatiblePorts(source.outputs, input.type, "source")}. Inputs on "${target.id}" that would accept "${output.name}": ${compatiblePorts(target.inputs, output.type, "target")}.`,
        nodeId: target.id,
        edge,
      });
    }
  }

  // Structural checks from the shared validator. Port-level cases are already
  // covered above, so INVALID_CONNECTION and TYPE_MISMATCH are skipped here to
  // avoid telling the model the same thing twice in weaker words.
  for (const error of validateWorkflow(workflow, nodeTypes)) {
    if (error.type === "TYPE_MISMATCH" || error.type === "INVALID_CONNECTION") {
      continue;
    }
    errors.push({
      code: error.type,
      severity: "fatal",
      message: error.message,
      fix: fixForStructuralError(error.type, error.message),
      nodeId: error.details.nodeId,
    });
  }

  // Checks the validator does not perform at all.
  const connectedInputs = new Set(
    workflow.edges.map((e) => `${e.target}:${e.targetInput}`)
  );
  const touched = new Set(workflow.edges.flatMap((e) => [e.source, e.target]));

  for (const node of workflow.nodes) {
    for (const input of node.inputs) {
      if (!input.required || input.hidden) continue;
      if (connectedInputs.has(`${node.id}:${input.name}`)) continue;
      if (hasUsableValue(input.value)) continue;
      errors.push({
        code: "MISSING_REQUIRED_INPUT",
        severity: "fatal",
        message: `Node "${node.id}" is missing required input "${input.name}".`,
        fix: `Node "${node.id}" (type ${node.type}) requires "${input.name}" (${input.type}). Either connect an edge into it, or set a literal value in that node's "inputs" object.`,
        nodeId: node.id,
      });
    }

    if (!touched.has(node.id) && workflow.nodes.length > 1) {
      errors.push({
        code: "ORPHAN_NODE",
        severity: "warning",
        message: `Node "${node.id}" is not connected to anything.`,
        fix: `Node "${node.id}" has no edges. Connect it or remove it.`,
        nodeId: node.id,
      });
    }
  }

  const responder = byId.get(RESPONDER_NODE_ID);
  if (responder && !touched.has(RESPONDER_NODE_ID)) {
    errors.push({
      code: "MISSING_RESPONDER",
      severity: "fatal",
      message: "The response node has nothing connected to it.",
      fix: `This trigger requires a response. Connect exactly one edge into "${RESPONDER_NODE_ID}" (inputs: ${describePorts(responder.inputs)}).`,
      nodeId: RESPONDER_NODE_ID,
    });
  }

  for (const node of workflow.nodes) {
    const oneOf = ONE_OF_INPUTS[node.type];
    if (!oneOf) continue;

    const satisfied = oneOf.some(
      (name) =>
        connectedInputs.has(`${node.id}:${name}`) ||
        hasUsableValue(node.inputs.find((input) => input.name === name)?.value)
    );
    if (satisfied) continue;

    errors.push({
      code: "MISSING_ONE_OF_INPUTS",
      severity: "fatal",
      message: `Node "${node.id}" needs one of: ${oneOf.join(", ")}.`,
      fix: `Node "${node.id}" (type ${node.type}) has none of ${oneOf.map((name) => `"${name}"`).join(" or ")} set. Exactly one is enough — connect an edge into one of them, or give it a literal value.`,
      nodeId: node.id,
    });
  }

  // Last, so a graph that is structurally broken is reported as broken rather
  // than as undelivered — the model can only act on one story at a time.
  if (context.destination) {
    const undelivered = checkDestination(
      workflow,
      nodeTypes,
      context.destination
    );
    if (undelivered) errors.push(undelivered);
  }

  return errors;
}

function fixForStructuralError(type: string, message: string): string {
  switch (type) {
    case "CYCLE_DETECTED":
      return "The graph contains a cycle. Workflows must be acyclic — remove the edge that loops back to an earlier node.";
    case "DUPLICATE_NODE_ID":
      return "Two nodes share an id. Give every node a unique id.";
    case "DUPLICATE_CONNECTION":
      return "The same source port is wired to the same target port twice. Remove the duplicate edge.";
    case "DUPLICATE_TRIGGER":
      return `Only one trigger node is allowed, and "${TRIGGER_NODE_ID}" is already provided. Do not add trigger nodes.`;
    case "EMPTY_WORKFLOW":
      return "The workflow has no nodes. Emit at least one node that produces output.";
    default:
      return message;
  }
}

/** Renders fatal findings as a numbered instruction list for the repair prompt. */
export function formatErrorsForLLM(errors: EnrichedValidationError[]): string {
  const fatal = errors.filter((e) => e.severity === "fatal");
  if (fatal.length === 0) return "";

  return fatal
    .map((error, index) => {
      const where = error.edge
        ? ` [edge ${error.edge.source}.${error.edge.sourceOutput} -> ${error.edge.target}.${error.edge.targetInput}]`
        : error.nodeId
          ? ` [node ${error.nodeId}]`
          : "";
      return `${index + 1}. ${error.code}${where}: ${error.fix}`;
    })
    .join("\n");
}
