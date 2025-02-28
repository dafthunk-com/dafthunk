import { memo } from "react";
import { EdgeProps, getSmoothStepPath } from "reactflow";
import { cn } from "@/lib/utils";

interface WorkflowEdgeData {
  isValid?: boolean;
  isActive?: boolean;
}

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
        {isActive && (
          <circle
            r="4"
            className={cn(
              "fill-blue-500 animate-[moveAlongPath_2s_linear_infinite]",
              "filter drop-shadow-md",
              {
                "fill-red-400": !isValid,
              }
            )}
            style={{
              offsetPath: `path("${edgePath}")`,
              offsetRotate: "0deg",
            }}
          />
        )}
      </g>
    );
  }
);

WorkflowEdge.displayName = "WorkflowEdge";
