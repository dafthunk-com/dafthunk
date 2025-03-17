import { memo } from "react";
import { EdgeProps, getSmoothStepPath, MarkerType } from "reactflow";
import { cn } from "@/lib/utils";
import { WorkflowEdgeData } from "./workflow-types";

interface WorkflowEdgeProps extends EdgeProps<WorkflowEdgeData> {
  zIndex?: number;
}

export const WorkflowEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
    zIndex,
  }: WorkflowEdgeProps) => {
    const [edgePath] = getSmoothStepPath({
      sourceX: sourceX + 6,
      sourceY,
      targetX: targetX - 9,
      targetY,
      sourcePosition,
      targetPosition,
      borderRadius: 8,
    });

    const isValid = data?.isValid ?? true;
    const isActive = data?.isActive ?? false;

    const getColor = () => {
      if (!isValid) return '#f87171'; // red-400
      if (selected) return '#3b82f6'; // blue-500
      return '#d1d5db'; // gray-300
    };

    const arrowId = `arrow-${id}`;
    const rectId = `rect-${id}`;

    return (
      <g>
        <defs>
          <marker
            id={arrowId}
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path
              d="M 0 0 L 10 5 L 0 10 z"
              fill={getColor()}
              stroke={getColor()}
              strokeWidth="1"
            />
          </marker>
          <marker
            id={rectId}
            viewBox="0 0 4 10"
            refX="2"
            refY="5"
            markerWidth="4"
            markerHeight="8"
          >
            <rect
              x="0"
              y="0"
              width="4"
              height="10"
              fill={getColor()}
              stroke={getColor()}
              strokeWidth="1"
            />
          </marker>
        </defs>
        <path
          d={edgePath}
          className={cn("stroke-[1] fill-none", {
            "stroke-gray-300": !selected && isValid,
            "stroke-blue-500": selected && isValid,
            "stroke-red-400": !isValid,
            "animate-pulse": isActive,
          })}
          markerEnd={`url(#${arrowId})`}
          markerStart={`url(#${rectId})`}
          style={{
            zIndex: zIndex
          }}
        />
      </g>
    );
  }
);

WorkflowEdge.displayName = "WorkflowEdge";
