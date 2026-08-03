import { validateWorkflow } from "@dafthunk/runtime";
import type { Node, NodeType, Parameter, Workflow } from "@dafthunk/types";
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

export function enrichValidation(
  workflow: Workflow,
  nodeTypes: NodeType[],
  extra: EnrichedValidationError[] = []
): EnrichedValidationError[] {
  const errors: EnrichedValidationError[] = [...extra];
  const byId = new Map<string, Node>(workflow.nodes.map((n) => [n.id, n]));

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
      if (input.value !== undefined) continue;
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
