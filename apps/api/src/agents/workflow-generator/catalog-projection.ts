import type { NodeType, Parameter } from "@dafthunk/types";

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

/** Hidden inputs are set by the server, never by the model. */
function visibleInputs(nodeType: NodeType): Parameter[] {
  return nodeType.inputs.filter((p) => !p.hidden);
}

export function projectNodeType(nodeType: NodeType): string {
  const lines: string[] = [`## ${nodeType.type} — ${nodeType.name}`];

  if (nodeType.tags.length) lines.push(`tags: ${nodeType.tags.join(", ")}`);
  if (nodeType.description) lines.push(nodeType.description);

  const inputs = visibleInputs(nodeType);
  lines.push(
    inputs.length
      ? `in:  ${inputs.map(renderParameter).join(" | ")}`
      : "in:  (none)"
  );
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

export function projectCatalog(nodeTypes: NodeType[]): string {
  return nodeTypes.map(projectNodeType).join("\n\n");
}
