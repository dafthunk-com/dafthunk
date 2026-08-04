import { NON_LITERAL_PARAMETER_TYPES } from "@dafthunk/utils";
import type { Edge, Node } from "@xyflow/react";

import { registry } from "./widgets";
import type {
  WorkflowEdgeType,
  WorkflowNodeType,
  WorkflowParameter,
} from "./workflow-types";

export type ExampleNodeValues = Record<string, Record<string, unknown>>;

/**
 * Examples are snapshots of the canvas rather than a form of their own.
 *
 * The editor already has an editor for every input — the widget on the node. So
 * saving an example captures what those widgets currently hold, and selecting one
 * writes the values back. Nothing here duplicates the editing surface, and it
 * works the same whether a workflow has two inputs or forty.
 *
 * The cost, accepted deliberately: applying an example mutates the graph, so the
 * canvas always shows what will actually run.
 */

/** True when a value on this input is the author's to set. */
function isSettable(
  node: Node<WorkflowNodeType>,
  input: WorkflowNodeType["inputs"][number],
  connected: ReadonlySet<string>
): boolean {
  if (connected.has(`${node.id}:${input.id}`)) return false;
  if (NON_LITERAL_PARAMETER_TYPES.has(input.type)) return false;
  if (!input.hidden) return true;

  // Hidden usually means "the node owns this", but an input-widget node hides the
  // very value it exists to hold because the widget renders it inline. The
  // registry knows the difference, and returns null for a locked node so a pinned
  // model stays out.
  const widget = node.data.nodeType
    ? registry.for(
        node.data.nodeType,
        node.id,
        node.data.inputs,
        node.data.outputs,
        node.data.metadata
      )
    : null;

  return Boolean(widget?.managedFields.has(input.id));
}

/** Every settable value currently on the canvas. */
export function captureValues(
  nodes: Node<WorkflowNodeType>[],
  edges: Edge<WorkflowEdgeType>[]
): ExampleNodeValues {
  const connected = new Set(
    edges.map((edge) => `${edge.target}:${edge.targetHandle}`)
  );

  const captured: ExampleNodeValues = {};
  for (const node of nodes) {
    for (const input of node.data.inputs ?? []) {
      if (!isSettable(node, input, connected)) continue;
      if (input.value === undefined) continue;

      captured[node.id] ??= {};
      // Keyed by the parameter name the backend uses, which the editor's
      // adaptation stores as `id`.
      captured[node.id][input.id] = input.value;
    }
  }

  return captured;
}

/** How many values a snapshot holds, for labelling. */
export function countValues(values: ExampleNodeValues): number {
  return Object.values(values).reduce(
    (total, inputs) => total + Object.keys(inputs).length,
    0
  );
}

/**
 * Writes a snapshot back onto the canvas.
 *
 * Values whose node or input has since disappeared are skipped rather than
 * recreated — the graph has moved on, and the saved value stays in the example in
 * case the node comes back.
 */
export function applyValues(
  values: ExampleNodeValues,
  nodes: Node<WorkflowNodeType>[],
  updateNodeData: (
    nodeId: string,
    data: (current: WorkflowNodeType) => Partial<WorkflowNodeType>
  ) => void
): number {
  let applied = 0;

  for (const node of nodes) {
    const wanted = values[node.id];
    if (!wanted) continue;

    const names = Object.keys(wanted).filter((name) =>
      (node.data.inputs ?? []).some((input) => input.id === name)
    );
    if (names.length === 0) continue;

    applied += names.length;
    updateNodeData(node.id, (current) => ({
      // Cast: spreading a value back onto a discriminated ParameterType widens
      // `value` past the variant's own type. The example holds whatever the
      // widget produced for this input, so the pairing is already correct.
      inputs: current.inputs.map((input) =>
        names.includes(input.id)
          ? ({ ...input, value: wanted[input.id] } as WorkflowParameter)
          : input
      ),
    }));
  }

  return applied;
}
