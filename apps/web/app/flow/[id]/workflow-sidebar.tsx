import { Node as ReactFlowNode, Edge as ReactFlowEdge } from 'reactflow';
import { NodeInspector } from './node-inspector';
import { EdgeInspector } from './edge-inspector';

interface WorkflowSidebarProps {
  node: ReactFlowNode | null;
  edge: ReactFlowEdge | null;
}

export function WorkflowSidebar({ node, edge }: WorkflowSidebarProps) {
  if (!node && !edge) return null;

  return (
    <div className="h-full">
      {node && <NodeInspector node={node} />}
      {edge && <EdgeInspector edge={edge} />}
    </div>
  );
} 