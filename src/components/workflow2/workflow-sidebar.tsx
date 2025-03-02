import { Node, Edge } from "reactflow";
import { WorkflowNodeInspector } from "./workflow-node-inspector";
import { WorkflowEdgeInspector } from "./workflow-edge-inspector";
import { WorkflowNodeData } from "./workflow-node";
import { WorkflowEdgeData } from "./workflow-edge";

interface WorkflowSidebarProps {
  node: Node<WorkflowNodeData> | null;
  edge: Edge<WorkflowEdgeData> | null;
  onNodeUpdate?: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  onEdgeUpdate?: (edgeId: string, data: Partial<WorkflowEdgeData>) => void;
}

export function WorkflowSidebar({
  node,
  edge,
  onNodeUpdate,
  onEdgeUpdate,
}: WorkflowSidebarProps) {
  return (
    <div className="h-full border-l border-gray-200 p-4 overflow-y-auto">
      {node && <WorkflowNodeInspector node={node} onNodeUpdate={onNodeUpdate} />}
      {edge && <WorkflowEdgeInspector edge={edge} onEdgeUpdate={onEdgeUpdate} />}
    </div>
  );
} 