import type {
  ObjectReference,
  WorkflowRuntime,
  WorkflowTrigger,
} from "@dafthunk/types";
import type {
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
} from "@xyflow/react";
import ChevronDownIcon from "lucide-react/icons/chevron-down";
import Users from "lucide-react/icons/users";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { WorkflowCriteriaManager } from "./workflow-criteria-manager";
import { WorkflowEdgeInspector } from "./workflow-edge-inspector";
import { WorkflowFeedbackSection } from "./workflow-feedback-section";
import { WorkflowNodeInspector } from "./workflow-node-inspector";
import type {
  WorkflowEdgeType,
  WorkflowExecutionStatus,
  WorkflowNodeType,
} from "./workflow-types";

export interface WorkflowSidebarProps {
  nodes: ReactFlowNode<WorkflowNodeType>[];
  selectedNodes: ReactFlowNode<WorkflowNodeType>[];
  selectedEdges: ReactFlowEdge<WorkflowEdgeType>[];
  onNodeUpdate?: (nodeId: string, data: Partial<WorkflowNodeType>) => void;
  onEdgeUpdate?: (edgeId: string, data: Partial<WorkflowEdgeType>) => void;
  createObjectUrl: (objectReference: ObjectReference) => string;
  disabledWorkflow?: boolean;
  disabledFeedback?: boolean;
  workflowId?: string;
  workflowName?: string;
  workflowDescription?: string;
  workflowTrigger?: WorkflowTrigger;
  workflowRuntime?: WorkflowRuntime;
  onWorkflowUpdate?: (
    name: string,
    description?: string,
    trigger?: WorkflowTrigger,
    runtime?: WorkflowRuntime
  ) => void;
  workflowStatus?: WorkflowExecutionStatus;
  workflowErrorMessage?: string;
  executionId?: string;
  isEnabled?: boolean;
  isTogglingEnabled?: boolean;
  onToggleEnabled?: (checked: boolean) => void;
  onTriggerChange?: (newTrigger: WorkflowTrigger) => void;
}

export function WorkflowSidebar({
  nodes,
  selectedNodes,
  selectedEdges,
  onNodeUpdate,
  onEdgeUpdate,
  createObjectUrl,
  disabledWorkflow = false,
  disabledFeedback = false,
  workflowId,
  workflowName = "",
  workflowDescription = "",
  workflowTrigger = "manual",
  workflowRuntime = "workflow",
  onWorkflowUpdate,
  workflowStatus,
  workflowErrorMessage,
  executionId,
  isEnabled,
  isTogglingEnabled,
  onToggleEnabled,
  onTriggerChange,
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
  const [localTrigger, setLocalTrigger] =
    useState<WorkflowTrigger>(workflowTrigger);
  const [localRuntime, setLocalRuntime] =
    useState<WorkflowRuntime>(workflowRuntime);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Single ref to avoid stale closures in debounced callback
  const localStateRef = useRef({
    name: localName,
    description: localDescription,
    trigger: localTrigger,
    runtime: localRuntime,
  });
  localStateRef.current = {
    name: localName,
    description: localDescription,
    trigger: localTrigger,
    runtime: localRuntime,
  };

  // Collapsible section state
  const [propertiesExpanded, setPropertiesExpanded] = useState(true);
  const [errorExpanded, setErrorExpanded] = useState(true);

  // Update local state when props change
  useEffect(() => {
    setLocalName(workflowName);
  }, [workflowName]);

  useEffect(() => {
    setLocalDescription(workflowDescription || "");
  }, [workflowDescription]);

  useEffect(() => {
    setLocalTrigger(workflowTrigger);
  }, [workflowTrigger]);

  useEffect(() => {
    setLocalRuntime(workflowRuntime);
  }, [workflowRuntime]);

  // Shared debounced update — reads latest values from ref when timer fires
  const scheduleDebouncedUpdate = () => {
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    updateTimeoutRef.current = setTimeout(() => {
      const s = localStateRef.current;
      onWorkflowUpdate?.(
        s.name,
        s.description || undefined,
        s.trigger,
        s.runtime
      );
    }, 500);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalName(e.target.value);
    scheduleDebouncedUpdate();
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setLocalDescription(e.target.value);
    scheduleDebouncedUpdate();
  };

  // Trigger and runtime changes are applied immediately (no debounce)
  const handleTriggerChange = (newTrigger: WorkflowTrigger) => {
    setLocalTrigger(newTrigger);
    onTriggerChange?.(newTrigger);
  };

  const handleRuntimeChange = (newRuntime: WorkflowRuntime) => {
    setLocalRuntime(newRuntime);
    const s = localStateRef.current;
    onWorkflowUpdate?.(
      s.name,
      s.description || undefined,
      s.trigger,
      newRuntime
    );
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
    };
  }, []);

  return (
    <div className="h-full overflow-y-auto border-s bg-card">
      {singleSelectedNode && totalSelected === 1 && (
        <WorkflowNodeInspector
          key={singleSelectedNode.id}
          node={singleSelectedNode}
          nodes={nodes}
          onNodeUpdate={onNodeUpdate}
          disabled={disabledWorkflow}
          createObjectUrl={createObjectUrl}
        />
      )}
      {singleSelectedEdge && totalSelected === 1 && (
        <WorkflowEdgeInspector
          edge={singleSelectedEdge}
          onEdgeUpdate={onEdgeUpdate}
          disabled={disabledWorkflow}
        />
      )}
      {totalSelected === 0 && (
        <div className="h-full flex flex-col">
          <div className="border-b border-border">
            <button
              onClick={() => setPropertiesExpanded(!propertiesExpanded)}
              className="group w-full px-4 py-3 flex items-center justify-between"
            >
              <h2 className="text-base font-semibold text-foreground">
                Workflow Properties
              </h2>
              <ChevronDownIcon
                className={`h-4 w-4 ${
                  propertiesExpanded ? "rotate-0" : "-rotate-90"
                } text-neutral-400 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300`}
              />
            </button>
            {propertiesExpanded && (
              <>
                <div className="px-4 pb-2">
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
                      disabled={disabledWorkflow}
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
                      disabled={disabledWorkflow}
                    />
                  </div>
                  <div>
                    <Label htmlFor="workflow-trigger">Trigger Type</Label>
                    <Select
                      value={localTrigger}
                      onValueChange={(value) =>
                        handleTriggerChange(value as WorkflowTrigger)
                      }
                      disabled={disabledWorkflow}
                    >
                      <SelectTrigger id="workflow-trigger" className="mt-2">
                        <SelectValue placeholder="Select trigger type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="http_webhook">
                          HTTP Webhook
                        </SelectItem>
                        <SelectItem value="http_request">
                          HTTP Request
                        </SelectItem>
                        <SelectItem value="email_message">
                          Email Message
                        </SelectItem>
                        <SelectItem value="discord_event">
                          Discord Event
                        </SelectItem>
                        <SelectItem value="telegram_event">
                          Telegram Event
                        </SelectItem>
                        <SelectItem value="whatsapp_event">
                          WhatsApp Event
                        </SelectItem>
                        <SelectItem value="slack_event">Slack Event</SelectItem>
                        <SelectItem value="queue_message">
                          Queue Message
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="workflow-runtime">Execution Mode</Label>
                    <Select
                      value={localRuntime}
                      onValueChange={(value) =>
                        handleRuntimeChange(value as WorkflowRuntime)
                      }
                      disabled={disabledWorkflow}
                    >
                      <SelectTrigger id="workflow-runtime" className="mt-2">
                        <SelectValue placeholder="Select execution mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="workflow">Resilient</SelectItem>
                        <SelectItem value="worker">Responsive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {onToggleEnabled && (
                    <div>
                      <Label htmlFor="workflow-enabled">Enabled</Label>
                      <div className="mt-2">
                        <Switch
                          id="workflow-enabled"
                          checked={isEnabled}
                          onCheckedChange={onToggleEnabled}
                          disabled={isTogglingEnabled || disabledWorkflow}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Workflow Error Section - only show when there's an error */}
          {workflowStatus === "error" && workflowErrorMessage && (
            <div className="border-b border-border">
              <button
                onClick={() => setErrorExpanded(!errorExpanded)}
                className="group w-full px-4 py-3 flex items-center justify-between"
              >
                <h2 className="text-base font-semibold text-foreground">
                  Error
                </h2>
                <ChevronDownIcon
                  className={`h-4 w-4 ${
                    errorExpanded ? "rotate-0" : "-rotate-90"
                  } text-neutral-400 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300`}
                />
              </button>
              {errorExpanded && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-red-600 dark:text-red-400 break-words">
                    {workflowErrorMessage}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Feedback replaces criteria manager when execution is completed */}
          {executionId && workflowStatus === "completed" ? (
            <WorkflowFeedbackSection
              executionId={executionId}
              workflowId={workflowId}
              disabled={disabledFeedback}
            />
          ) : (
            workflowId &&
            !disabledWorkflow && (
              <WorkflowCriteriaManager workflowId={workflowId} />
            )
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
