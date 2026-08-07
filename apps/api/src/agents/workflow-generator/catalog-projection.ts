import type { NodeType, Parameter } from "@dafthunk/types";

import { describeAgentTools, isAgentNodeType } from "./agent-tools";

/**
 * Compact rendering of the node catalog for the prompt.
 *
 * The full `/types` payload is several hundred kilobytes, dominated by the
 * `documentation` and `specification` prose fields. Neither helps a model wire
 * a graph, so both are dropped; what remains is the contract — type id, one
 * line of intent, and the ports with their types.
 */

function renderParameter(parameter: Parameter): string {
  const flags: string[] = [];
  if (parameter.required) flags.push("required");
  if (parameter.enum?.length) flags.push(`one of: ${parameter.enum.join("|")}`);

  const suffix = flags.length ? `(${flags.join(", ")})` : "";
  const description = parameter.description
    ? ` — ${parameter.description}`
    : "";

  return `${parameter.name}:${parameter.type}${suffix}${description}`;
}

/**
 * Hidden inputs are set by the server, never by the model.
 *
 * With one exception, which is why `agentTools` exists below. `hidden` carries
 * two meanings — "no handle on the canvas" for the editor, "not the model's to
 * write" here — and they part company on an agent's `tools`, an input the
 * editor gives its own panel and the generator has every reason to author.
 */
function visibleInputs(nodeType: NodeType): Parameter[] {
  return nodeType.inputs.filter((p) => !p.hidden);
}

export interface ProjectionOptions {
  /**
   * Node types a generated agent may call. Renders the otherwise-hidden `tools`
   * port on agent node types; an empty list leaves them looking like plain
   * model nodes, which is what they are without it.
   */
  agentTools?: NodeType[];
}

export function projectNodeType(
  nodeType: NodeType,
  options: ProjectionOptions = {}
): string {
  const lines: string[] = [`## ${nodeType.type} — ${nodeType.name}`];

  if (nodeType.tags.length) lines.push(`tags: ${nodeType.tags.join(", ")}`);
  if (nodeType.description) lines.push(nodeType.description);

  const inputs = visibleInputs(nodeType);
  const authorable = isAgentNodeType(nodeType)
    ? describeAgentTools(options.agentTools ?? [])
    : [];

  const rendered = [...inputs.map(renderParameter), ...authorable];
  lines.push(rendered.length ? `in:  ${rendered.join(" | ")}` : "in:  (none)");
  lines.push(
    nodeType.outputs.length
      ? `out: ${nodeType.outputs.map(renderParameter).join(" | ")}`
      : "out: (none)"
  );

  if (nodeType.dynamicInputs) {
    const { prefix, type, defaultCount } = nodeType.dynamicInputs;
    lines.push(
      `note: accepts a variable number of inputs named ${prefix}_1, ${prefix}_2, … (type ${type}, ${defaultCount} shown by default). Connect as many as you need.`
    );
  }

  return lines.join("\n");
}

export function projectCatalog(
  nodeTypes: NodeType[],
  options: ProjectionOptions = {}
): string {
  return nodeTypes
    .map((nodeType) => projectNodeType(nodeType, options))
    .join("\n\n");
}
