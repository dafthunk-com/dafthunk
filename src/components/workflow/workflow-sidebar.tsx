import { WorkflowNodeInspector } from "./workflow-node-inspector";
import { WorkflowEdgeInspector } from "./workflow-edge-inspector";
import { WorkflowSidebarProps } from "./workflow-types";
import { useMemo } from "react";
import { Sparkles } from "lucide-react";

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
        <WorkflowNodeInspector
          node={selectedNode}
          onNodeUpdate={onNodeUpdate}
        />
      )}
      {edge && (
        <WorkflowEdgeInspector edge={edge} onEdgeUpdate={onEdgeUpdate} />
      )}
      {!selectedNode && !edge && (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <Sparkles className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nothing Selected</h3>
          <p className="text-gray-500">
            Click on a node or edge in the workflow to view and edit its properties.
          </p>
        </div>
      )}
    </div>
  );
}
