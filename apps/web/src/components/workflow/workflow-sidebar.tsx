import { WorkflowNodeInspector } from "./workflow-node-inspector";
import { WorkflowEdgeInspector } from "./workflow-edge-inspector";
import { WorkflowSidebarProps } from "./workflow-types";
import { useMemo } from "react";
import { Sparkles, Eye } from "lucide-react";

export function WorkflowSidebar({
  node,
  edge,
  onNodeUpdate,
  onEdgeUpdate,
  readonly = false,
}: WorkflowSidebarProps) {
  // Memoize the selected node to ensure we get a clean render when it changes
  const selectedNode = useMemo(() => node, [node]);

  return (
    <div className="h-full overflow-y-auto border-s">
      {selectedNode && (
        <WorkflowNodeInspector
          node={selectedNode}
          onNodeUpdate={onNodeUpdate}
          readonly={readonly}
        />
      )}
      {edge && (
        <WorkflowEdgeInspector
          edge={edge}
          onEdgeUpdate={onEdgeUpdate}
          readonly={readonly}
        />
      )}
      {!selectedNode && !edge && (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          {readonly ? (
            <>
              <Eye className="w-12 h-12 text-amber-400 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                Read-only Mode
              </h3>
              <p className="text-neutral-500">
                You can view node and edge properties, but cannot make changes
                in this mode.
              </p>
            </>
          ) : (
            <>
              <Sparkles className="w-12 h-12 text-neutral-400 dark:text-neutral-500 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                Nothing Selected
              </h3>
              <p className="text-neutral-500">
                Click on a node or edge in the workflow to view and edit its
                properties.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
