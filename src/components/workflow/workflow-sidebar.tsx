import { WorkflowNodeInspector } from "./workflow-node-inspector";
import { WorkflowEdgeInspector } from "./workflow-edge-inspector";
import { WorkflowSidebarProps } from "./workflow-types";

export function WorkflowSidebar({
  node,
  edge,
  onNodeUpdate,
}: WorkflowSidebarProps) {
  return (
    <div className="h-full p-4 overflow-y-auto">
      {node && (
        <WorkflowNodeInspector node={node} onNodeUpdate={onNodeUpdate} />
      )}
      {edge && (
        <WorkflowEdgeInspector edge={edge} />
      )}
    </div>
  );
}
