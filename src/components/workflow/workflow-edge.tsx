import { memo } from "react";
import { EdgeProps, getSmoothStepPath } from "reactflow";
import { cn } from "@/lib/utils";
import { WorkflowEdgeData } from "./workflow-types";

export const WorkflowEdge = memo(
  ({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd,
    selected,
  }: EdgeProps<WorkflowEdgeData>) => {
    const [edgePath] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      borderRadius: 8,
    });

    const isValid = data?.isValid ?? true;
    const isActive = data?.isActive ?? false;

    return (
      <g>
        <path
          d={edgePath}
          className={cn("stroke-[1] fill-none", {
            "stroke-gray-300": !selected && isValid,
            "stroke-blue-500": selected && isValid,
            "stroke-red-400": !isValid,
            "animate-pulse": isActive,
            "z-0": !selected,
            "z-10": selected,
          })}
          markerEnd={markerEnd}
        />
      </g>
    );
  }
);

WorkflowEdge.displayName = "WorkflowEdge";
