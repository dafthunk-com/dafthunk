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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor" 
            className="w-12 h-12 text-gray-400 mb-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nothing Selected</h3>
          <p className="text-gray-500">
            Click on a node or edge in the workflow to view and edit its properties.
          </p>
        </div>
      )}
    </div>
  );
}
