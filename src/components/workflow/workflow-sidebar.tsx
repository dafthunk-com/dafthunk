import { Node as ReactFlowNode, Edge as ReactFlowEdge } from 'reactflow';
import { WorkflowNodeInspector } from './workflow-node-inspector';
import { WorkflowEdgeInspector } from './workflow-edge-inspector';

interface WorkflowSidebarProps {
  node: ReactFlowNode | null;
  edge: ReactFlowEdge | null;
}

export function WorkflowSidebar({ node, edge }: WorkflowSidebarProps) {
  if (!node && !edge) return null;

  return (
    <div className="h-full">
      {node && <WorkflowNodeInspector node={node} />}
      {edge && <WorkflowEdgeInspector edge={edge} />}
    </div>
  );
} 