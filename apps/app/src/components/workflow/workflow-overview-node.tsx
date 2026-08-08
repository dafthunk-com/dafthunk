import { Handle, Position } from "@xyflow/react";
import type { IconName } from "lucide-react/dynamic.mjs";
import { DynamicIcon } from "lucide-react/dynamic.mjs";
import BoxIcon from "lucide-react/icons/box";
import CheckIcon from "lucide-react/icons/check";
import MinusIcon from "lucide-react/icons/minus";
import XIcon from "lucide-react/icons/x";
import { memo } from "react";

import { cn } from "@/utils/utils";

import { useWorkflow } from "./workflow-context";
import type { WorkflowNodeType } from "./workflow-types";

/**
 * The schematic rendering of a node: icon, name, and what happened to it.
 *
 * This is the editor's overview mode — the same picture the brief page's build
 * canvas draws, so a workflow opened right after generation is recognizably
 * the thing the user just watched get made. It deliberately shows none of the
 * wiring detail (ports, widgets, fields); every input and output still gets a
 * handle, invisible and collapsed to the pill's edge midpoints, because the
 * edges reference handle ids and would vanish without them.
 */

/** Collapse a handle to an invisible point; edges converge on the pill edge. */
const overviewHandleClassName =
  "opacity-0! pointer-events-none! size-1! min-w-0! min-h-0! border-0!";

export const WorkflowOverviewNode = memo(
  ({ data, selected }: { data: WorkflowNodeType; selected?: boolean }) => {
    const { nodeTypes } = useWorkflow();

    const template = data.nodeType
      ? nodeTypes?.find((t) => t.type === data.nodeType)
      : undefined;

    const state = data.executionState;
    // The same verdict language as the brief page's build canvas: a run that
    // neither completed nor failed a node reads as "not run".
    const verdict =
      state === "completed"
        ? "completed"
        : state === "error"
          ? "error"
          : state === "skipped"
            ? "unrun"
            : undefined;

    return (
      <div
        className={cn(
          "flex h-10 w-[176px] items-center gap-2 rounded-md border bg-card px-2.5 text-xs text-card-foreground shadow-xs",
          {
            "border-border": !selected && state === "idle",
            "border-yellow-400":
              !selected && (state === "executing" || state === "pending"),
            "border-green-500": !selected && state === "completed",
            "border-red-500": !selected && state === "error",
            "border-blue-400": !selected && state === "skipped",
            "border-blue-500": selected,
          }
        )}
      >
        {data.inputs.map((input) => (
          <Handle
            key={input.id}
            id={input.id}
            type="target"
            position={Position.Left}
            isConnectable={false}
            className={overviewHandleClassName}
          />
        ))}

        {data.icon ? (
          <DynamicIcon
            name={data.icon as IconName}
            className={cn(
              "size-3.5 shrink-0",
              template?.trigger || template?.responder
                ? "text-emerald-500"
                : "text-blue-500"
            )}
          />
        ) : (
          <BoxIcon className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate font-medium">{data.name}</span>

        {verdict && (
          <span
            className={cn(
              "ml-auto flex size-4 shrink-0 items-center justify-center rounded-full",
              verdict === "completed" &&
                "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
              verdict === "error" &&
                "bg-red-500/15 text-red-600 dark:text-red-400",
              verdict === "unrun" && "text-muted-foreground"
            )}
          >
            {verdict === "completed" ? (
              <CheckIcon className="size-3" />
            ) : verdict === "error" ? (
              <XIcon className="size-3" />
            ) : (
              <MinusIcon className="size-3" />
            )}
          </span>
        )}

        {data.outputs.map((output) => (
          <Handle
            key={output.id}
            id={output.id}
            type="source"
            position={Position.Right}
            isConnectable={false}
            className={overviewHandleClassName}
          />
        ))}
      </div>
    );
  }
);

WorkflowOverviewNode.displayName = "WorkflowOverviewNode";
