import MinusIcon from "lucide-react/icons/minus";
import PlusIcon from "lucide-react/icons/plus";
import { useCallback } from "react";

import { cn } from "@/utils/utils";

import { useWorkflow } from "../../workflow-context";
import type { WorkflowParameter } from "../../workflow-types";
import type { BaseWidgetProps } from "../widget";
import { createWidget } from "../widget";

const CASE_PATTERN = /^case_(\d+)$/;

interface SwitchForkCasesWidgetProps extends BaseWidgetProps {
  nodeId: string;
  caseCount: number;
  minCount: number;
}

function SwitchForkCasesWidget({
  nodeId,
  caseCount,
  minCount,
  className,
  disabled = false,
}: SwitchForkCasesWidgetProps) {
  const { updateNodeData, edges, deleteEdge } = useWorkflow();

  const canRemove = caseCount > minCount;

  const handleAdd = useCallback(() => {
    if (disabled || !updateNodeData) return;

    updateNodeData(nodeId, (current) => {
      const maxIndex = [...current.inputs, ...current.outputs].reduce(
        (max, p) => {
          const match = p.id.match(CASE_PATTERN);
          return match ? Math.max(max, Number.parseInt(match[1], 10)) : max;
        },
        0
      );
      const nextIndex = maxIndex + 1;

      const inputTemplate = current.inputs.find((p) => CASE_PATTERN.test(p.id));
      const outputTemplate = current.outputs.find((p) =>
        CASE_PATTERN.test(p.id)
      );
      if (!inputTemplate || !outputTemplate) return {};

      const newInput: WorkflowParameter = {
        ...inputTemplate,
        id: `case_${nextIndex}`,
        name: `case_${nextIndex}`,
        value: undefined,
      };
      const newOutput: WorkflowParameter = {
        ...outputTemplate,
        id: `case_${nextIndex}`,
        name: `case_${nextIndex}`,
        value: undefined,
      };
      return {
        inputs: [...current.inputs, newInput],
        outputs: [...current.outputs, newOutput],
      };
    });
  }, [disabled, updateNodeData, nodeId]);

  const handleRemove = useCallback(() => {
    if (disabled || !updateNodeData) return;
    if (caseCount <= minCount) return;

    const lastCaseId = `case_${caseCount}`;

    if (edges && deleteEdge) {
      for (const edge of edges) {
        if (edge.target === nodeId && edge.targetHandle === lastCaseId) {
          deleteEdge(edge.id);
        }
        if (edge.source === nodeId && edge.sourceHandle === lastCaseId) {
          deleteEdge(edge.id);
        }
      }
    }

    updateNodeData(nodeId, (current) => {
      const inputCount = current.inputs.filter((p) =>
        CASE_PATTERN.test(p.id)
      ).length;
      if (inputCount <= minCount) return {};
      return {
        inputs: current.inputs.filter((p) => p.id !== lastCaseId),
        outputs: current.outputs.filter((p) => p.id !== lastCaseId),
      };
    });
  }, [
    disabled,
    updateNodeData,
    nodeId,
    caseCount,
    minCount,
    edges,
    deleteEdge,
  ]);

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
        aria-label="Remove case"
      >
        <MinusIcon className="h-3 w-3" />
      </button>
      <span className="flex-1 text-center text-xs text-muted-foreground tabular-nums">
        {caseCount} {caseCount === 1 ? "case" : "cases"}
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
        aria-label="Add case"
      >
        <PlusIcon className="h-3 w-3" />
      </button>
    </div>
  );
}

function countCases(inputs: WorkflowParameter[]): number {
  return inputs.filter((i) => CASE_PATTERN.test(i.id)).length;
}

interface SwitchForkCasesWidgetConfig {
  minCount: number;
}

export function createSwitchForkCasesWidget(
  nodeType: string,
  config: SwitchForkCasesWidgetConfig
) {
  return createWidget({
    component: SwitchForkCasesWidget,
    nodeTypes: [nodeType],
    inputField: "cases",
    extractConfig: (nodeId, inputs) => ({
      nodeId,
      caseCount: countCases(inputs),
      minCount: config.minCount,
    }),
  });
}
