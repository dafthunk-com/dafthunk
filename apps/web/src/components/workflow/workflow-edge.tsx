import { memo } from "react";
import {
  EdgeProps,
  getSmoothStepPath,
  ConnectionLineComponentProps,
  Position,
  Edge as ReactFlowEdge,
} from "@xyflow/react";
import { cn } from "@/utils/utils";
import { WorkflowEdgeType } from "./workflow-types";

interface WorkflowEdgeProps extends EdgeProps<ReactFlowEdge<WorkflowEdgeType>> {
  zIndex?: number;
}

// Shared path creator for both edge and connection line
const createSmoothStepPath = (params: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  sourceOffset?: number;
  targetOffset?: number;
}) => {
  const { sourceOffset = 0, targetOffset = 0 } = params;
  return getSmoothStepPath({
    sourceX: params.sourceX + sourceOffset,
    sourceY: params.sourceY,
    targetX: params.targetX + targetOffset,
    targetY: params.targetY,
    sourcePosition: params.sourcePosition,
    targetPosition: params.targetPosition,
    borderRadius: 8,
  });
};

// Shared SVG rendering for both components
const renderPath = (
  path: string,
  id: string,
  color: string,
  isActive?: boolean,
  zIndex?: number
) => {
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
            fill={color}
            stroke={color}
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
            fill={color}
            stroke={color}
            strokeWidth="1"
          />
        </marker>
      </defs>
      <path
        d={path}
        className={cn("stroke-[1] fill-none", {
          "animate-pulse": isActive,
        })}
        style={{
          stroke: color,
          zIndex: zIndex,
        }}
        markerEnd={`url(#${arrowId})`}
        markerStart={`url(#${rectId})`}
      />
    </g>
  );
};

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
    const [edgePath] = createSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      // Use fixed offsets for regular edges
      sourceOffset: 6,
      targetOffset: -9,
    });

    const isValid = data?.isValid ?? true;
    const isActive = data?.isActive ?? false;

    const getColor = () => {
      if (!isValid) return "#f87171"; // red-400
      if (selected) return "#3b82f6"; // blue-500
      return "#d1d5db"; // gray-300
    };

    return renderPath(edgePath, id, getColor(), isActive, zIndex);
  }
);

WorkflowEdge.displayName = "WorkflowEdge";

// Connection line component using the same rendering logic
export const WorkflowConnectionLine = memo(
  ({
    fromX,
    fromY,
    toX,
    toY,
    fromPosition,
    toPosition,
    connectionStatus,
  }: ConnectionLineComponentProps) => {
    // For connection lines, use different offsets or no offsets
    const [edgePath] = createSmoothStepPath({
      sourceX: fromX,
      sourceY: fromY,
      targetX: toX,
      targetY: toY,
      sourcePosition: fromPosition,
      targetPosition: toPosition,
      // No offsets for connection lines
      sourceOffset: 16,
      targetOffset: -19,
    });

    const getColor = () => {
      if (connectionStatus === "invalid") return "#f87171"; // red-400
      if (connectionStatus === "valid") return "#16a34a"; // green-600
      return "#d1d5db"; // gray-300
    };

    // Use a unique ID for connection lines
    return renderPath(edgePath, "connection", getColor(), false, undefined);
  }
);

WorkflowConnectionLine.displayName = "WorkflowConnectionLine";
