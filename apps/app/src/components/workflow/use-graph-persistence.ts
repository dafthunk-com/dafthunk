import type { Edge as ReactFlowEdge, Node as ReactFlowNode } from "@xyflow/react";
import { useEffect, useRef } from "react";

import type { WorkflowEdgeType, WorkflowNodeType } from "./workflow-types";

// Strip execution-only fields so persistence ignores transient state
const stripExecutionFields = (
  data: WorkflowNodeType
): Omit<WorkflowNodeType, "executionState" | "error"> & {
  outputs: Omit<WorkflowNodeType["outputs"][number], "value">[];
  inputs: WorkflowNodeType["inputs"];
} => {
  const { executionState, error, ...rest } = data;

  return {
    ...rest,
    outputs: data.outputs.map(({ value, ...outputRest }) => outputRest),
    inputs: data.inputs,
  };
};

const stripEdgeExecutionFields = (
  data: WorkflowEdgeType = {}
): Omit<WorkflowEdgeType, "isActive"> => {
  const { isActive, ...rest } = data;
  return rest;
};

interface UseGraphPersistenceProps {
  nodes: ReactFlowNode<WorkflowNodeType>[];
  edges: ReactFlowEdge<WorkflowEdgeType>[];
  disabled: boolean;
  onNodesChangePersist?: (nodes: ReactFlowNode<WorkflowNodeType>[]) => void;
  onEdgesChangePersist?: (edges: ReactFlowEdge<WorkflowEdgeType>[]) => void;
}

/**
 * Side-effect-only hook that notifies the parent when persistable
 * graph data (nodes/edges minus execution state) actually changes.
 */
export function useGraphPersistence({
  nodes,
  edges,
  disabled,
  onNodesChangePersist,
  onEdgesChangePersist,
}: UseGraphPersistenceProps): void {
  const lastPersistedNodesRef = useRef<string>("");
  const lastPersistedEdgesRef = useRef<string>("");

  // Persist nodes when their persistable data changes
  useEffect(() => {
    if (disabled) return;

    const normalizedNodes = nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: stripExecutionFields(node.data),
    }));

    const serialized = JSON.stringify(normalizedNodes);

    if (serialized !== lastPersistedNodesRef.current) {
      lastPersistedNodesRef.current = serialized;
      onNodesChangePersist?.(nodes);
    }
  }, [nodes, onNodesChangePersist, disabled]);

  // Persist edges when their persistable data changes
  useEffect(() => {
    if (disabled) return;

    const normalizedEdges = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: edge.type,
      data: stripEdgeExecutionFields(edge.data),
    }));

    const serialized = JSON.stringify(normalizedEdges);

    if (serialized !== lastPersistedEdgesRef.current) {
      lastPersistedEdgesRef.current = serialized;
      onEdgesChangePersist?.(edges);
    }
  }, [edges, onEdgesChangePersist, disabled]);
}
