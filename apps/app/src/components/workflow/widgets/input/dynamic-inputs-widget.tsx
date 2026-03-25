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
  inputCount: number;
}

function DynamicInputsWidget({
  nodeId,
  nodeType,
  inputCount,
  className,
  disabled = false,
}: DynamicInputsWidgetProps) {
  const { updateNodeData, edges, deleteEdge, nodeTypes } = useWorkflow();

  const config = nodeTypes?.find((t) => t.type === nodeType)?.dynamicInputs;
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
      const template = current.inputs[0];
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
    if (disabled || !updateNodeData || !config) return;
    if (inputCount <= config.minCount) return;

    // Find and disconnect edges to the last input before updating node data
    if (edges && deleteEdge) {
      // Find the last dynamic input by looking at current edges
      const lastInputId = `${config.prefix}_${inputCount}`;
      for (const edge of edges) {
        if (edge.target === nodeId && edge.targetHandle === lastInputId) {
          deleteEdge(edge.id);
        }
      }
    }

    updateNodeData(nodeId, (current) => {
      if (current.inputs.length <= config.minCount) return {};
      return { inputs: current.inputs.slice(0, -1) };
    });
  }, [disabled, updateNodeData, nodeId, config, inputCount, edges, deleteEdge]);

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
        {inputCount} {inputCount === 1 ? "input" : "inputs"}
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
 * Counts inputs matching the dynamic prefix pattern (e.g. input_1, input_2, …)
 */
function countDynamicInputs(
  inputs: WorkflowParameter[],
  config: DynamicInputsConfig
): number {
  const pattern = new RegExp(`^${config.prefix}_\\d+$`);
  return inputs.filter((i) => pattern.test(i.id)).length;
}

/**
 * Creates a dynamic inputs widget descriptor for a given node type.
 */
export function createDynamicInputsWidget(
  nodeType: string,
  config: DynamicInputsConfig
) {
  return createWidget({
    component: DynamicInputsWidget,
    nodeTypes: [nodeType],
    inputField: `${config.prefix}_1`,
    extractConfig: (nodeId, inputs) => ({
      nodeId,
      nodeType,
      inputCount: countDynamicInputs(inputs, config),
    }),
  });
}
