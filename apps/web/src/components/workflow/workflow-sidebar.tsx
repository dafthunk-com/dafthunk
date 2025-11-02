import type { ObjectReference } from "@dafthunk/types";
import type {
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
} from "@xyflow/react";
import Eye from "lucide-react/icons/eye";
import Sparkles from "lucide-react/icons/sparkles";
import Users from "lucide-react/icons/users";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { WorkflowEdgeInspector } from "./workflow-edge-inspector";
import { WorkflowNodeInspector } from "./workflow-node-inspector";
import type { WorkflowEdgeType, WorkflowNodeType } from "./workflow-types";

export interface WorkflowSidebarProps {
  nodes: ReactFlowNode<WorkflowNodeType>[];
  selectedNodes: ReactFlowNode<WorkflowNodeType>[];
  selectedEdges: ReactFlowEdge<WorkflowEdgeType>[];
  onNodeUpdate?: (nodeId: string, data: Partial<WorkflowNodeType>) => void;
  onEdgeUpdate?: (edgeId: string, data: Partial<WorkflowEdgeType>) => void;
  createObjectUrl: (objectReference: ObjectReference) => string;
  disabled?: boolean;
  workflowName?: string;
  workflowDescription?: string;
  onWorkflowUpdate?: (name: string, description?: string) => void;
}

export function WorkflowSidebar({
  nodes,
  selectedNodes,
  selectedEdges,
  onNodeUpdate,
  onEdgeUpdate,
  createObjectUrl,
  disabled = false,
  workflowName = "",
  workflowDescription = "",
  onWorkflowUpdate,
}: WorkflowSidebarProps) {
  // Determine what to show based on selection
  const totalSelected = selectedNodes.length + selectedEdges.length;
  const singleSelectedNode =
    selectedNodes.length === 1 ? selectedNodes[0] : null;
  const singleSelectedEdge =
    selectedEdges.length === 1 ? selectedEdges[0] : null;

  // Local state for workflow properties
  const [localName, setLocalName] = useState(workflowName);
  const [localDescription, setLocalDescription] = useState(workflowDescription);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update local state when props change
  useEffect(() => {
    setLocalName(workflowName);
  }, [workflowName]);

  useEffect(() => {
    setLocalDescription(workflowDescription || "");
  }, [workflowDescription]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setLocalName(newName);

    // Debounce the update
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      if (onWorkflowUpdate) {
        onWorkflowUpdate(newName, localDescription || undefined);
      }
    }, 500);
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const newDescription = e.target.value;
    setLocalDescription(newDescription);

    // Debounce the update
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      if (onWorkflowUpdate) {
        onWorkflowUpdate(localName, newDescription || undefined);
      }
    }, 500);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="h-full overflow-y-auto border-s bg-card">
      {singleSelectedNode && totalSelected === 1 && (
        <WorkflowNodeInspector
          node={singleSelectedNode}
          nodes={nodes}
          onNodeUpdate={onNodeUpdate}
          disabled={disabled}
          createObjectUrl={createObjectUrl}
        />
      )}
      {singleSelectedEdge && totalSelected === 1 && (
        <WorkflowEdgeInspector
          edge={singleSelectedEdge}
          onEdgeUpdate={onEdgeUpdate}
          disabled={disabled}
        />
      )}
      {totalSelected === 0 && (
        <div className="h-full">
          {disabled ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <Eye className="w-12 h-12 text-amber-400 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                Read-only Mode
              </h3>
              <p className="text-neutral-500">
                You can view node and edge properties, but cannot make changes
                in this mode.
              </p>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="border-b border-border">
                <div className="px-4 py-3">
                  <h2 className="text-base font-semibold text-foreground mb-1">
                    Workflow Properties
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Configure the name and description for this workflow.
                  </p>
                </div>
                <div className="px-4 pb-4 space-y-3">
                  <div>
                    <Label htmlFor="workflow-name">Workflow Name</Label>
                    <Input
                      id="workflow-name"
                      value={localName}
                      onChange={handleNameChange}
                      placeholder="Enter workflow name"
                      className="mt-2"
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <Label htmlFor="workflow-description">
                      Description (Optional)
                    </Label>
                    <Textarea
                      id="workflow-description"
                      value={localDescription}
                      onChange={handleDescriptionChange}
                      placeholder="Describe what you are building"
                      className="mt-2"
                      maxLength={256}
                      rows={3}
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                <Sparkles className="w-12 h-12 text-neutral-400 dark:text-neutral-500 mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                  Nothing Selected
                </h3>
                <p className="text-neutral-500">
                  Click on a node or edge in the workflow to view and edit its
                  properties.
                </p>
              </div>
            </div>
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
