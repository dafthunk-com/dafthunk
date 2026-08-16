import type { DynamicInputsConfig } from "@dafthunk/types";
import MinusIcon from "lucide-react/icons/minus";
import PlusIcon from "lucide-react/icons/plus";
import { useCallback } from "react";

import { cn } from "@/utils/utils";

import { useWorkflow } from "../../workflow-context";
import type { WorkflowParameter } from "../../workflow-types";
import type { BaseWidgetProps } from "../widget";
import { createWidget } from "../widget";

interface DynamicInputsWidgetProps extends BaseWidgetProps {
  nodeId: string;
  nodeType: string;
  /** Ids of the node's dynamic inputs, in index order */
  inputIds: string[];
  label: string;
  labelPlural: string;
}

function DynamicInputsWidget({
  nodeId,
  nodeType,
  inputIds,
  label,
  labelPlural,
  className,
  disabled = false,
}: DynamicInputsWidgetProps) {
  const { updateNodeData, edges, deleteEdge, nodeTypes } = useWorkflow();

  const config = nodeTypes?.find((t) => t.type === nodeType)?.dynamicInputs;
  const inputCount = inputIds.length;
  const lastInputId = inputIds[inputCount - 1];
  const canRemove = config ? inputCount > config.minCount : false;

  const handleAdd = useCallback(() => {
    if (disabled || !updateNodeData || !config) return;

    updateNodeData(nodeId, (current) => {
      const pattern = new RegExp(`^${config.prefix}_(\\d+)$`);
      const maxIndex = current.inputs.reduce((max, inp) => {
        const match = inp.id.match(pattern);
        return match ? Math.max(max, Number.parseInt(match[1])) : max;
      }, 0);
      const nextIndex = maxIndex + 1;
      // Clone an existing dynamic input, not whichever input happens to come
      // first: the node's own inputs sit alongside these, and copying one of
      // those gave the new slot its type and its required flag.
      const template = current.inputs.find((inp) => pattern.test(inp.id));
      if (!template) return {};
      const newInput: WorkflowParameter = {
        ...template,
        id: `${config.prefix}_${nextIndex}`,
        name: `${config.prefix}_${nextIndex}`,
        value: undefined,
      };
      return { inputs: [...current.inputs, newInput] };
    });
  }, [disabled, updateNodeData, nodeId, config]);

  const handleRemove = useCallback(() => {
    if (disabled || !updateNodeData || !config || !lastInputId) return;
    if (inputCount <= config.minCount) return;

    // Disconnect edges into the input before it goes away
    if (edges && deleteEdge) {
      for (const edge of edges) {
        if (edge.target === nodeId && edge.targetHandle === lastInputId) {
          deleteEdge(edge.id);
        }
      }
    }

    updateNodeData(nodeId, (current) => {
      if (countDynamicInputs(current.inputs, config) <= config.minCount) {
        return {};
      }
      return { inputs: current.inputs.filter((i) => i.id !== lastInputId) };
    });
  }, [
    disabled,
    updateNodeData,
    nodeId,
    config,
    inputCount,
    lastInputId,
    edges,
    deleteEdge,
  ]);

  if (!config) return null;

  return (
    <div className={cn("px-2 py-1.5 flex items-center gap-1", className)}>
      <button
        type="button"
        className={cn(
          "flex items-center justify-center rounded p-0.5",
          "border border-border bg-background hover:bg-accent",
          "text-muted-foreground hover:text-foreground",
          { "opacity-50 cursor-not-allowed": disabled || !canRemove }
        )}
        onClick={handleRemove}
        disabled={disabled || !canRemove}
        aria-label="Remove input"
      >
        <MinusIcon className="h-3 w-3" />
      </button>
      <span className="flex-1 text-center text-xs text-muted-foreground tabular-nums">
        {inputCount} {inputCount === 1 ? label : labelPlural}
      </span>
      <button
        type="button"
        className={cn(
          "flex items-center justify-center rounded p-0.5",
          "border border-border bg-background hover:bg-accent",
          "text-muted-foreground hover:text-foreground",
          { "opacity-50 cursor-not-allowed": disabled }
        )}
        onClick={handleAdd}
        disabled={disabled}
        aria-label="Add input"
      >
        <PlusIcon className="h-3 w-3" />
      </button>
    </div>
  );
}

/**
 * Ids of the inputs matching the dynamic prefix pattern (input_1, input_2, …),
 * ordered by index — which is not always the order they are stored in.
 */
function dynamicInputIds(
  inputs: WorkflowParameter[],
  config: DynamicInputsConfig
): string[] {
  const pattern = new RegExp(`^${config.prefix}_(\\d+)$`);
  return inputs
    .map((i) => [i.id, i.id.match(pattern)?.[1]] as const)
    .filter(
      (entry): entry is readonly [string, string] => entry[1] !== undefined
    )
    .sort(([, a], [, b]) => Number.parseInt(a) - Number.parseInt(b))
    .map(([id]) => id);
}

function countDynamicInputs(
  inputs: WorkflowParameter[],
  config: DynamicInputsConfig
): number {
  return dynamicInputIds(inputs, config).length;
}

/**
 * Creates a dynamic inputs widget descriptor for a given node type.
 *
 * The counter is bound to no input field: it changes how many inputs the node
 * has, so binding it to one of them would cost that input its editor.
 *
 * The counter label defaults to "input"/"inputs"; pass `label` (and optionally
 * `labelPlural`) to override (e.g. "case"/"cases").
 */
export function createDynamicInputsWidget(
  nodeType: string,
  config: DynamicInputsConfig,
  options?: {
    label?: string;
    labelPlural?: string;
    managedFields?: string[];
  }
) {
  const label = options?.label ?? "input";
  const labelPlural = options?.labelPlural ?? `${label}s`;
  return createWidget({
    component: DynamicInputsWidget,
    nodeTypes: [nodeType],
    managedFields: options?.managedFields,
    extractConfig: (nodeId, inputs) => ({
      nodeId,
      nodeType,
      inputIds: dynamicInputIds(inputs, config),
      label,
      labelPlural,
    }),
  });
}
