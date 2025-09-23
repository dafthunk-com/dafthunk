import type { ObjectReference } from "@dafthunk/types";
import type {
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
} from "@xyflow/react";
import Eye from "lucide-react/icons/eye";
import Sparkles from "lucide-react/icons/sparkles";
import Users from "lucide-react/icons/users";

import { WorkflowEdgeInspector } from "./workflow-edge-inspector";
import { WorkflowNodeInspector } from "./workflow-node-inspector";
import type { WorkflowEdgeType, WorkflowNodeType } from "./workflow-types";

export interface WorkflowSidebarProps {
  selectedNodes: ReactFlowNode<WorkflowNodeType>[];
  selectedEdges: ReactFlowEdge<WorkflowEdgeType>[];
  onNodeUpdate?: (nodeId: string, data: Partial<WorkflowNodeType>) => void;
  onEdgeUpdate?: (edgeId: string, data: Partial<WorkflowEdgeType>) => void;
  createObjectUrl: (objectReference: ObjectReference) => string;
  readonly?: boolean;
}

export function WorkflowSidebar({
  selectedNodes,
  selectedEdges,
  onNodeUpdate,
  onEdgeUpdate,
  createObjectUrl,
  readonly = false,
}: WorkflowSidebarProps) {
  // Determine what to show based on selection
  const totalSelected = selectedNodes.length + selectedEdges.length;
  const singleSelectedNode =
    selectedNodes.length === 1 ? selectedNodes[0] : null;
  const singleSelectedEdge =
    selectedEdges.length === 1 ? selectedEdges[0] : null;

  return (
    <div className="h-full overflow-y-auto border-s bg-card">
      {singleSelectedNode && totalSelected === 1 && (
        <WorkflowNodeInspector
          node={singleSelectedNode}
          onNodeUpdate={onNodeUpdate}
          readonly={readonly}
          createObjectUrl={createObjectUrl}
        />
      )}
      {singleSelectedEdge && totalSelected === 1 && (
        <WorkflowEdgeInspector
          edge={singleSelectedEdge}
          onEdgeUpdate={onEdgeUpdate}
          readonly={readonly}
        />
      )}
      {totalSelected === 0 && (
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
      {totalSelected > 1 && (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <Users className="w-12 h-12 text-blue-400 dark:text-blue-500 mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
            Multiple Items Selected
          </h3>
          <p className="text-neutral-500 mb-4">
            {selectedNodes.length > 0 && selectedEdges.length > 0
              ? `${selectedNodes.length} node${selectedNodes.length !== 1 ? "s" : ""} and ${selectedEdges.length} edge${selectedEdges.length !== 1 ? "s" : ""} selected`
              : selectedNodes.length > 0
                ? `${selectedNodes.length} node${selectedNodes.length !== 1 ? "s" : ""} selected`
                : `${selectedEdges.length} edge${selectedEdges.length !== 1 ? "s" : ""} selected`}
          </p>
          <p className="text-sm text-neutral-400">
            Select a single item to view and edit its properties.
          </p>
        </div>
      )}
    </div>
  );
}
