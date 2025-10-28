import {
  ConnectionLineComponentProps,
  Edge as ReactFlowEdge,
  EdgeProps,
  getSmoothStepPath,
  Position,
} from "@xyflow/react";
import { memo } from "react";

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
  color: string,
  isActive?: boolean,
  zIndex?: number
) => {
  return (
    <path
      d={path}
      className={cn("stroke-[1] fill-none", {
        "animate-pulse": isActive,
      })}
      style={{
        stroke: color,
        zIndex: zIndex,
      }}
    />
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
      sourceOffset: 2,
      targetOffset: -5,
    });

    const isValid = data?.isValid ?? true;
    const isActive = data?.isActive ?? false;

    const getColor = () => {
      if (!isValid) return "#f87171"; // red-400
      if (selected) return "#3b82f6"; // blue-500
      return "#d1d5db"; // gray-300
    };

    return renderPath(edgePath, getColor(), isActive, zIndex);
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
      sourceOffset: 12,
      targetOffset: -15,
    });

    const getColor = () => {
      if (connectionStatus === "invalid") return "#f87171"; // red-400
      if (connectionStatus === "valid") return "#16a34a"; // green-600
      return "#d1d5db"; // gray-300
    };

    return renderPath(edgePath, getColor(), false, undefined);
  }
);

WorkflowConnectionLine.displayName = "WorkflowConnectionLine";
