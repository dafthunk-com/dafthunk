import type { ObjectReference, ToolReference } from "@dafthunk/types";
import { Handle, Position } from "@xyflow/react";
import { AsteriskIcon } from "lucide-react";
// @ts-ignore - https://github.com/lucide-icons/lucide/issues/2867#issuecomment-2847105863
import { DynamicIcon } from "lucide-react/dynamic.mjs";
import BoxIcon from "lucide-react/icons/box";
import BracesIcon from "lucide-react/icons/braces";
import CalendarIcon from "lucide-react/icons/calendar";
import CheckIcon from "lucide-react/icons/check";
import CircleHelp from "lucide-react/icons/circle-help";
import DatabaseIcon from "lucide-react/icons/database";
import FileIcon from "lucide-react/icons/file";
import FileTextIcon from "lucide-react/icons/file-text";
import FolderSearchIcon from "lucide-react/icons/folder-search";
import GlobeIcon from "lucide-react/icons/globe";
import HashIcon from "lucide-react/icons/hash";
import ImageIcon from "lucide-react/icons/image";
import LayersIcon from "lucide-react/icons/layers";
import LinkIcon from "lucide-react/icons/link";
import LockIcon from "lucide-react/icons/lock";
import MailIcon from "lucide-react/icons/mail";
import MusicIcon from "lucide-react/icons/music";
import SettingsIcon from "lucide-react/icons/settings";
import TrashIcon from "lucide-react/icons/trash-2";
import TypeIcon from "lucide-react/icons/type";
import VideoIcon from "lucide-react/icons/video";
import WrenchIcon from "lucide-react/icons/wrench";
import { createElement, memo, useState } from "react";

import { NodeDocsDialog } from "@/components/docs/node-docs-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/utils/utils";
import { PropertyField } from "./fields";
import { Field } from "./fields/field";
import { SubscriptionBadge } from "./subscription-badge";
import { ToolConfigPanel } from "./tool-config-panel";
import { registry } from "./widgets";
import {
  clearNodeInput,
  convertValueByType,
  updateNodeInput,
  useWorkflow,
} from "./workflow-context";
import { WorkflowToolSelector } from "./workflow-tool-selector";
import {
  InputOutputType,
  NodeExecutionState,
  WorkflowParameter,
} from "./workflow-types";

export interface WorkflowNodeType {
  name: string;
  inputs: WorkflowParameter[];
  outputs: WorkflowParameter[];
  error?: string | null;
  executionState: NodeExecutionState;
  nodeType?: string;
  icon: string;
  functionCalling?: boolean;
  asTool?: boolean;
  dragHandle?: string;
  createObjectUrl: (objectReference: ObjectReference) => string;
}

export const TypeBadge = ({
  type,
  position,
  id,
  nodeId,
  parameter,
  onInputClick,
  onOutputClick,
  disabled,
  className,
  executionState = "idle",
  selected = false,
}: {
  type: InputOutputType;
  position: Position;
  id: string;
  nodeId: string;
  parameter?: WorkflowParameter;
  onInputClick?: (param: WorkflowParameter, element: HTMLElement) => void;
  onOutputClick?: (param: WorkflowParameter, element: HTMLElement) => void;
  disabled?: boolean;
  className?: string;
  executionState?: NodeExecutionState;
  selected?: boolean;
}) => {
  const { edges = [] } = useWorkflow();
  const iconSize = "!size-2.5";

  const icon: Record<InputOutputType, React.ReactNode> = {
    string: <TypeIcon className={iconSize} />,
    number: <HashIcon className={iconSize} />,
    boolean: <CheckIcon className={iconSize} />,
    blob: <FileIcon className={iconSize} />,
    image: <ImageIcon className={iconSize} />,
    document: <FileTextIcon className={iconSize} />,
    audio: <MusicIcon className={iconSize} />,
    video: <VideoIcon className={iconSize} />,
    gltf: <BoxIcon className={iconSize} />,
    buffergeometry: <BoxIcon className={iconSize} />,
    json: <BracesIcon className={iconSize} />,
    date: <CalendarIcon className={iconSize} />,
    geojson: <GlobeIcon className={iconSize} />,
    secret: <LockIcon className={iconSize} />,
    database: <DatabaseIcon className={iconSize} />,
    dataset: <FolderSearchIcon className={iconSize} />,
    queue: <LayersIcon className={iconSize} />,
    email: <MailIcon className={iconSize} />,
    integration: <LinkIcon className={iconSize} />,
    any: <AsteriskIcon className={iconSize} />,
  } satisfies Record<InputOutputType, React.ReactNode>;

  const handleClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (disabled) return;

    if (position === Position.Left && parameter && onInputClick) {
      onInputClick(parameter, e.currentTarget);
    } else if (position === Position.Right && parameter && onOutputClick) {
      onOutputClick(parameter, e.currentTarget);
    }
  };

  // Check if the parameter has a value set
  const hasValue = parameter && parameter.value !== undefined;
  // Check if the parameter is connected (computed from edges)
  const isConnected = edges.some(
    (edge) =>
      (edge.target === nodeId && edge.targetHandle === id) ||
      (edge.source === nodeId && edge.sourceHandle === id)
  );
  const isActive = hasValue || isConnected;
  // Determine if this is an input parameter
  const isInput = position === Position.Left;

  // Check if this parameter accepts multiple connections
  const repeated = parameter?.repeated || false;

  // Check if this is a required input with no value and no connection
  const isRequiredAndEmpty =
    isInput && parameter?.required && !hasValue && !isConnected;

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Multiple connections indicator background ring */}
      {repeated && (
        <div
          className={cn(
            "absolute inset-0 rounded-lg border shadow-sm bg-background",
            {
              "border-border": !selected && executionState === "idle",
              "border-yellow-400":
                !selected &&
                (executionState === "executing" ||
                  executionState === "pending"),
              "border-green-500": !selected && executionState === "completed",
              "border-red-500": !selected && executionState === "error",
              "border-blue-400": !selected && executionState === "skipped",
              "border-blue-500": selected,
            }
          )}
          style={{
            width: "20px",
            height: "20px",
            transform: "translate(-50%, -50%)",
          }}
        />
      )}
      <Handle
        type={position === Position.Left ? "target" : "source"}
        position={position}
        id={id}
        className={cn(
          "!w-4 !h-4 !border !rounded-md !inline-flex !items-center !justify-center p !shadow-sm",
          {
            "!bg-neutral-200 dark:!bg-neutral-700": isActive,
            "!bg-white dark:!bg-neutral-900": !isActive,
            "!border-border": !selected && executionState === "idle",
            "!border-yellow-400":
              !selected &&
              (executionState === "executing" || executionState === "pending"),
            "!border-green-500": !selected && executionState === "completed",
            "!border-red-500": !selected && executionState === "error",
            "!border-blue-400": !selected && executionState === "skipped",
            "!border-blue-500": selected,
          },
          className
        )}
        isConnectableStart={!disabled}
        isConnectable={!disabled}
        onClick={handleClick}
      >
        <span
          className={cn(
            "inline-flex items-center justify-center text-xs font-medium pointer-events-none",
            {
              "text-red-500 dark:text-red-400": isRequiredAndEmpty,
              "text-neutral-800 dark:text-neutral-300":
                !isRequiredAndEmpty && (isConnected || hasValue),
              "text-neutral-600 dark:text-neutral-400":
                !isRequiredAndEmpty && !isConnected && (!isInput || !hasValue),
            }
          )}
        >
          {icon[type]}
        </span>
      </Handle>
    </div>
  );
};

export const WorkflowNode = memo(
  ({
    data,
    selected,
    id,
  }: {
    data: WorkflowNodeType;
    selected?: boolean;
    id: string;
  }) => {
    const {
      updateNodeData,
      disabled,
      nodeTypes,
      edges = [],
      workflowTrigger,
    } = useWorkflow();
    const [isToolSelectorOpen, setIsToolSelectorOpen] = useState(false);
    const [isDocsOpen, setIsDocsOpen] = useState(false);
    const [activeInputId, setActiveInputId] = useState<string | null>(null);
    const [activeOutputId, setActiveOutputId] = useState<string | null>(null);
    const [configToolId, setConfigToolId] = useState<string | null>(null);

    // Get node type
    const nodeType = data.nodeType || "";

    // Resolve node type from templates for docs
    const resolvedNodeType = (() => {
      if (!nodeTypes || nodeTypes.length === 0) return null;
      // Prefer matching by type identifier when available
      if (nodeType) {
        const byType = nodeTypes.find((t) => t.type === nodeType);
        if (byType) return byType;
      }
      // Fallback to name match
      return nodeTypes.find((t) => t.name === data.name) || null;
    })();

    // Get widget for this node type
    const widget = nodeType
      ? registry.for(nodeType, id, data.inputs, data.outputs)
      : null;

    const handleWidgetChange = (value: any) => {
      if (disabled || !updateNodeData || !widget) return;

      const input = data.inputs.find((i) => i.id === widget.inputField);
      if (input) {
        updateNodeInput(id, input.id, value, data.inputs, updateNodeData);
      }
    };

    // Find hidden inputs with resource types to render as inline selectors
    const resourceTypes = new Set([
      "database",
      "dataset",
      "queue",
      "email",
      "integration",
    ]);
    const resourceInputs = data.inputs.filter(
      (input) => input.hidden && resourceTypes.has(input.type)
    );

    const handleToolSelectorClose = () => {
      setIsToolSelectorOpen(false);
    };

    const handleToolsSelect = (tool: ToolReference) => {
      if (disabled || !updateNodeData) return;

      // Use functional updater to always read the latest node data,
      // avoiding stale closure issues with React.memo
      updateNodeData(id, (currentData) => {
        const toolsInput = currentData.inputs.find(
          (input) => input.id === "tools"
        );
        if (!toolsInput) return {};

        const currentTools = Array.isArray(toolsInput.value)
          ? (toolsInput.value as ToolReference[])
          : [];

        if (currentTools.some((t) => t.identifier === tool.identifier)) {
          return {};
        }

        const updatedTools = [...currentTools, tool];
        const updatedInputs = currentData.inputs.map((input) =>
          input.id === "tools"
            ? ({ ...input, value: updatedTools } as WorkflowParameter)
            : input
        );
        return { inputs: updatedInputs };
      });
    };

    const handleRemoveTool = (toolIdentifier: string) => {
      if (disabled || !updateNodeData) return;

      updateNodeData(id, (currentData) => {
        const toolsInput = currentData.inputs.find(
          (input) => input.id === "tools"
        );
        if (!toolsInput) return {};

        const currentTools = Array.isArray(toolsInput.value)
          ? (toolsInput.value as ToolReference[])
          : [];

        const updatedTools = currentTools.filter(
          (t) => t.identifier !== toolIdentifier
        );

        const updatedInputs = currentData.inputs.map((input) =>
          input.id === "tools"
            ? ({ ...input, value: updatedTools } as WorkflowParameter)
            : input
        );
        return { inputs: updatedInputs };
      });
    };

    const handleToolConfigSave = (
      toolIdentifier: string,
      config: Record<string, unknown>
    ) => {
      if (disabled || !updateNodeData) return;

      updateNodeData(id, (currentData) => {
        const toolsInput = currentData.inputs.find(
          (input) => input.id === "tools"
        );
        if (!toolsInput) return {};

        const currentTools = Array.isArray(toolsInput.value)
          ? (toolsInput.value as ToolReference[])
          : [];

        const updatedTools = currentTools.map((t) =>
          t.identifier === toolIdentifier
            ? {
                ...t,
                config: Object.keys(config).length > 0 ? config : undefined,
              }
            : t
        );

        const updatedInputs = currentData.inputs.map((input) =>
          input.id === "tools"
            ? ({ ...input, value: updatedTools } as WorkflowParameter)
            : input
        );
        return { inputs: updatedInputs };
      });
    };

    // Get current selected tools from the tools input
    const getCurrentSelectedTools = (): ToolReference[] => {
      const toolsInput = data.inputs.find((input) => input.id === "tools");
      if (toolsInput && Array.isArray(toolsInput.value)) {
        return toolsInput.value as ToolReference[];
      }
      return [];
    };

    const handleInputClick = (
      param: WorkflowParameter,
      _element: HTMLElement
    ) => {
      if (disabled) return;
      // Don't allow clicking on connected inputs
      const isConnected = edges.some(
        (edge) =>
          (edge.target === id && edge.targetHandle === param.id) ||
          (edge.source === id && edge.sourceHandle === param.id)
      );
      if (isConnected) return;
      // Open dialog for this input
      setActiveInputId(param.id);
    };

    const handleOutputClick = (
      param: WorkflowParameter,
      _element: HTMLElement
    ) => {
      // Only show preview if there's a value
      if (param.value === undefined) return;
      // Open dialog for this output
      setActiveOutputId(param.id);
    };

    return (
      <TooltipProvider>
        <div
          className={cn("bg-card shadow-sm w-[220px] rounded-md border", {
            "border-border": !selected && data.executionState === "idle",
            "border-yellow-400":
              !selected &&
              (data.executionState === "executing" ||
                data.executionState === "pending"),
            "border-green-500":
              !selected && data.executionState === "completed",
            "border-red-500": !selected && data.executionState === "error",
            "border-blue-400": !selected && data.executionState === "skipped",
            "border-blue-500": selected,
          })}
        >
          {/* Header */}
          <div
            className={cn(
              "px-1 py-1 flex justify-between items-center hover:cursor-grab active:cursor-grabbing border-b",
              "workflow-node-drag-handle"
            )}
          >
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <DynamicIcon
                name={data.icon as any}
                className="mx-1 h-3 w-3 text-blue-500 shrink-0"
              />
              <h3 className="text-xs font-bold truncate">{data.name}</h3>
            </div>
            {resolvedNodeType?.subscription && (
              <SubscriptionBadge variant="muted" size="sm" />
            )}
            <button
              type="button"
              className={cn(
                "nodrag p-1 rounded",
                "text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300"
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (!resolvedNodeType) return;
                setIsDocsOpen(true);
              }}
              aria-label="Open node documentation"
              title={
                resolvedNodeType
                  ? "Open documentation"
                  : "Documentation unavailable"
              }
              disabled={!resolvedNodeType}
            >
              <CircleHelp className="h-3 w-3" />
            </button>
          </div>

          {/* Widget */}
          {widget && (
            <div className="px-0 py-0 nodrag border-b">
              {createElement(widget.Component, {
                ...widget.config,
                onChange: !disabled ? handleWidgetChange : () => {},
                disabled,
                createObjectUrl: data.createObjectUrl,
              })}
            </div>
          )}

          {/* Resource Selectors (database, dataset, queue, email, integration) */}
          {resourceInputs.length > 0 && (
            <div className="px-2 py-2 nodrag border-b space-y-1 [&_button]:text-xs [&_button]:h-7">
              {resourceInputs.map((input) => {
                const isConnected = edges.some(
                  (edge) => edge.target === id && edge.targetHandle === input.id
                );
                return (
                  <Field
                    key={input.id}
                    parameter={input}
                    value={input.value}
                    onChange={(value) => {
                      if (disabled || !updateNodeData) return;
                      updateNodeInput(
                        id,
                        input.id,
                        value,
                        data.inputs,
                        updateNodeData
                      );
                    }}
                    onClear={() => {
                      if (disabled || !updateNodeData) return;
                      clearNodeInput(id, input.id, data.inputs, updateNodeData);
                    }}
                    disabled={disabled}
                    connected={isConnected}
                  />
                );
              })}
            </div>
          )}

          {/* Tools bar (between header and body) */}
          {data.functionCalling && (
            <div className="px-2 py-2 nodrag border-b space-y-2">
              <button
                type="button"
                className={cn(
                  "w-full px-2 py-1 rounded text-xs font-medium flex items-center justify-center gap-1.5",
                  "border border-border bg-background hover:bg-neutral-100",
                  "dark:hover:bg-neutral-800",
                  {
                    "opacity-50 cursor-not-allowed": disabled,
                  }
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (disabled) return;
                  setIsToolSelectorOpen(true);
                }}
                disabled={disabled}
              >
                <WrenchIcon className="h-3 w-3" />
                Add Tool
              </button>
              {getCurrentSelectedTools().length > 0 && (
                <div className="space-y-1">
                  {[...getCurrentSelectedTools()]
                    .sort((a, b) => {
                      const tplA = nodeTypes?.find(
                        (t) => t.id === a.identifier
                      );
                      const tplB = nodeTypes?.find(
                        (t) => t.id === b.identifier
                      );
                      const nameA = tplA?.name || a.identifier;
                      const nameB = tplB?.name || b.identifier;
                      return nameA.localeCompare(nameB);
                    })
                    .map((tool, idx) => {
                      const tpl = nodeTypes?.find(
                        (t) => t.id === tool.identifier
                      );
                      return (
                        <div
                          key={`${tool.identifier}-${idx}`}
                          className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-neutral-100 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 w-full"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {tpl?.icon && (
                              <DynamicIcon
                                name={tpl.icon as any}
                                className="h-3 w-3 shrink-0"
                              />
                            )}
                            <span className="truncate">
                              {tpl?.name || tool.identifier}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              className={cn(
                                "hover:text-neutral-900 dark:hover:text-neutral-100",
                                tool.config &&
                                  Object.keys(tool.config).length > 0
                                  ? "text-blue-500 dark:text-blue-400"
                                  : "text-neutral-400 dark:text-neutral-500"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfigToolId(tool.identifier);
                              }}
                              disabled={disabled}
                              aria-label="Configure tool"
                            >
                              <SettingsIcon className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              className="text-neutral-400 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-neutral-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveTool(tool.identifier);
                              }}
                              disabled={disabled}
                              aria-label="Remove tool"
                            >
                              <TrashIcon className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* Parameters */}
          <div className="py-2 grid grid-cols-2 justify-between gap-3 nodrag">
            {/* Input Parameters */}
            <div className="flex flex-col gap-1 flex-1">
              {data.inputs
                .filter((input) => !input.hidden)
                .map((input, index) => (
                  <div
                    key={`input-${input.id}-${index}`}
                    className="flex items-center gap-3 text-xs relative"
                  >
                    <TypeBadge
                      type={input.type}
                      position={Position.Left}
                      id={input.id}
                      nodeId={id}
                      parameter={input}
                      onInputClick={handleInputClick}
                      disabled={disabled}
                      executionState={data.executionState}
                      selected={selected}
                    />
                    <span className="text-xs text-foreground font-medium font-mono truncate">
                      {input.name}
                    </span>
                  </div>
                ))}
            </div>

            {/* Output Parameters */}
            <div className="flex flex-col gap-1 flex-1 items-end">
              {data.outputs
                .filter((output) => !output.hidden)
                .map((output, index) => (
                  <div
                    key={`output-${output.id}-${index}`}
                    className="flex items-center gap-3 text-xs relative"
                  >
                    <span className="text-xs text-foreground font-medium font-mono truncate">
                      {output.name}
                    </span>
                    <TypeBadge
                      type={output.type}
                      position={Position.Right}
                      id={output.id}
                      nodeId={id}
                      parameter={output}
                      onOutputClick={handleOutputClick}
                      disabled={disabled}
                      executionState={data.executionState}
                      selected={selected}
                    />
                  </div>
                ))}
            </div>
          </div>
        </div>

        <WorkflowToolSelector
          open={data.functionCalling ? isToolSelectorOpen : false}
          onClose={handleToolSelectorClose}
          onSelect={handleToolsSelect}
          templates={nodeTypes || []}
          workflowTrigger={workflowTrigger}
        />

        {configToolId &&
          (() => {
            const tool = getCurrentSelectedTools().find(
              (t) => t.identifier === configToolId
            );
            const tpl = nodeTypes?.find((t) => t.id === configToolId);
            if (!tool || !tpl) return null;
            return (
              <ToolConfigPanel
                open={!!configToolId}
                onClose={() => setConfigToolId(null)}
                onSave={(config) => {
                  handleToolConfigSave(configToolId, config);
                  setConfigToolId(null);
                }}
                toolName={tpl.name}
                inputs={tpl.inputs}
                currentConfig={tool.config ?? {}}
              />
            );
          })()}

        {resolvedNodeType && (
          <NodeDocsDialog
            nodeType={resolvedNodeType}
            isOpen={isDocsOpen}
            onOpenChange={setIsDocsOpen}
          />
        )}

        <Dialog
          open={activeInputId !== null}
          onOpenChange={(open) => !open && setActiveInputId(null)}
        >
          <DialogContent
            className="sm:max-w-md pt-4"
            aria-describedby={undefined}
          >
            <DialogTitle className="sr-only">
              {data.inputs.find((i) => i.id === activeInputId)?.name ||
                "Edit Input"}
            </DialogTitle>
            {(() => {
              const activeInput = data.inputs.find(
                (i) => i.id === activeInputId
              );
              if (!activeInput) return null;

              const isInputConnected = edges.some(
                (edge) =>
                  (edge.target === id &&
                    edge.targetHandle === activeInput.id) ||
                  (edge.source === id && edge.sourceHandle === activeInput.id)
              );

              return (
                <PropertyField
                  parameter={activeInput}
                  value={activeInput.value}
                  onChange={(value) => {
                    const typedValue = convertValueByType(
                      value as string,
                      activeInput.type || "string"
                    );
                    updateNodeInput(
                      id,
                      activeInput.id,
                      typedValue,
                      data.inputs,
                      updateNodeData
                    );
                  }}
                  onClear={() => {
                    clearNodeInput(
                      id,
                      activeInput.id,
                      data.inputs,
                      updateNodeData
                    );
                  }}
                  onToggleVisibility={() => {
                    if (!updateNodeData) return;
                    const updatedInputs = data.inputs.map((input) =>
                      input.id === activeInput.id
                        ? { ...input, hidden: !input.hidden }
                        : input
                    );
                    updateNodeData(id, { ...data, inputs: updatedInputs });
                  }}
                  disabled={disabled}
                  connected={isInputConnected}
                  createObjectUrl={data.createObjectUrl}
                  autoFocus
                />
              );
            })()}
          </DialogContent>
        </Dialog>

        <Dialog
          open={activeOutputId !== null}
          onOpenChange={(open) => !open && setActiveOutputId(null)}
        >
          <DialogContent
            className="sm:max-w-md pt-4"
            aria-describedby={undefined}
          >
            <DialogTitle className="sr-only">
              {data.outputs.find((o) => o.id === activeOutputId)?.name ||
                "View Output"}
            </DialogTitle>
            {(() => {
              const activeOutput = data.outputs.find(
                (o) => o.id === activeOutputId
              );
              if (!activeOutput) return null;

              const isOutputConnected = edges.some(
                (edge) =>
                  (edge.target === id &&
                    edge.targetHandle === activeOutput.id) ||
                  (edge.source === id && edge.sourceHandle === activeOutput.id)
              );

              return (
                <PropertyField
                  parameter={activeOutput}
                  value={activeOutput.value}
                  onChange={() => {}}
                  onClear={() => {}}
                  onToggleVisibility={() => {
                    if (!updateNodeData) return;
                    const updatedOutputs = data.outputs.map((output) =>
                      output.id === activeOutput.id
                        ? { ...output, hidden: !output.hidden }
                        : output
                    );
                    updateNodeData(id, { ...data, outputs: updatedOutputs });
                  }}
                  disabled={disabled}
                  connected={isOutputConnected}
                  createObjectUrl={data.createObjectUrl}
                />
              );
            })()}
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    );
  }
);

WorkflowNode.displayName = "WorkflowNode";
