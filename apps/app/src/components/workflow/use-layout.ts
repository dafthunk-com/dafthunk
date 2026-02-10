import dagre from "@dagrejs/dagre";
import type {
  Edge as ReactFlowEdge,
  ReactFlowInstance,
  Node as ReactFlowNode,
} from "@xyflow/react";
import { useCallback } from "react";

import type { WorkflowEdgeType, WorkflowNodeType } from "./workflow-types";

interface UseLayoutProps {
  nodesRef: React.RefObject<ReactFlowNode<WorkflowNodeType>[]>;
  edgesRef: React.RefObject<ReactFlowEdge<WorkflowEdgeType>[]>;
  setNodes: React.Dispatch<
    React.SetStateAction<ReactFlowNode<WorkflowNodeType>[]>
  >;
  reactFlowInstance: ReactFlowInstance<
    ReactFlowNode<WorkflowNodeType>,
    ReactFlowEdge<WorkflowEdgeType>
  > | null;
  disabled: boolean;
}

interface UseLayoutReturn {
  applyLayout: () => void;
}

export function useLayout({
  nodesRef,
  edgesRef,
  setNodes,
  reactFlowInstance,
  disabled,
}: UseLayoutProps): UseLayoutReturn {
  const applyLayout = useCallback(() => {
    if (disabled) return;

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: "LR", nodesep: 100, ranksep: 100 });

    nodesRef.current.forEach((node) => {
      const nodeWidth = node.measured?.width || node.width || 200;
      const isOutputNode = node.data.nodeType?.startsWith("output-");
      const nodeHeight =
        node.measured?.height || node.height || (isOutputNode ? 250 : 100);
      dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edgesRef.current.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    setNodes((nds) =>
      nds.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const isOutputNode = node.data.nodeType?.startsWith("output-");
        const nodeWidth = node.measured?.width || node.width || 200;
        const nodeHeight =
          node.measured?.height || node.height || (isOutputNode ? 250 : 100);
        const x = nodeWithPosition.x - nodeWidth / 2;
        const y = nodeWithPosition.y - nodeHeight / 2;

        return {
          ...node,
          position: { x, y },
        };
      })
    );
    reactFlowInstance?.fitView();
  }, [setNodes, disabled, reactFlowInstance, nodesRef, edgesRef]);

  return { applyLayout };
}
