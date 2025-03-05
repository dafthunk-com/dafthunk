import { WorkflowNodeInspector } from "./workflow-node-inspector";
import { WorkflowEdgeInspector } from "./workflow-edge-inspector";
import { WorkflowSidebarProps } from "./workflow-types";
import { useMemo } from "react";

export function WorkflowSidebar({
  node,
  edge,
  onNodeUpdate,
  onEdgeUpdate,
}: WorkflowSidebarProps) {
  // Memoize the selected node to ensure we get a clean render when it changes
  const selectedNode = useMemo(() => node, [node]);
  
  return (
    <div className="h-full overflow-y-auto">
      {selectedNode && (
        <WorkflowNodeInspector node={selectedNode} onNodeUpdate={onNodeUpdate} />
      )}
      {edge && <WorkflowEdgeInspector edge={edge} onEdgeUpdate={onEdgeUpdate} />}
    </div>
  );
}
