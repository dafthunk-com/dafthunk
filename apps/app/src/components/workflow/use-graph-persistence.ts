import type {
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
} from "@xyflow/react";
import type { RefObject } from "react";
import { useEffect, useRef } from "react";

import { serializeEdges, serializeNodes } from "./graph-projection";
import type { WorkflowEdgeType, WorkflowNodeType } from "./workflow-types";

interface UseGraphPersistenceProps {
  nodes: ReactFlowNode<WorkflowNodeType>[];
  edges: ReactFlowEdge<WorkflowEdgeType>[];
  disabled: boolean;
  isDraggingRef: RefObject<boolean>;
  onNodesChangePersist?: (nodes: ReactFlowNode<WorkflowNodeType>[]) => void;
  onEdgesChangePersist?: (edges: ReactFlowEdge<WorkflowEdgeType>[]) => void;
}

/**
 * Side-effect-only hook that notifies the parent when persistable
 * graph data (see `graph-projection`) actually changes.
 */
export function useGraphPersistence({
  nodes,
  edges,
  disabled,
  isDraggingRef,
  onNodesChangePersist,
  onEdgesChangePersist,
}: UseGraphPersistenceProps): void {
  const lastPersistedNodesRef = useRef<string>("");
  const lastPersistedEdgesRef = useRef<string>("");

  // Persist nodes when their persistable data changes. Skipped mid-drag: the
  // final position is persisted by the re-render that `onNodeDragStop` forces.
  useEffect(() => {
    if (disabled || isDraggingRef.current) return;

    const serialized = serializeNodes(nodes);

    if (serialized !== lastPersistedNodesRef.current) {
      lastPersistedNodesRef.current = serialized;
      onNodesChangePersist?.(nodes);
    }
  }, [nodes, onNodesChangePersist, disabled, isDraggingRef]);

  // Persist edges when their persistable data changes
  useEffect(() => {
    if (disabled) return;

    const serialized = serializeEdges(edges);

    if (serialized !== lastPersistedEdgesRef.current) {
      lastPersistedEdgesRef.current = serialized;
      onEdgesChangePersist?.(edges);
    }
  }, [edges, onEdgesChangePersist, disabled]);
}
