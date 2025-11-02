import { ObjectReference } from "@dafthunk/types";
import { Handle, Position } from "@xyflow/react";
// @ts-ignore - https://github.com/lucide-icons/lucide/issues/2867#issuecomment-2847105863
import { DynamicIcon } from "lucide-react/dynamic.mjs";
import AsteriskIcon from "lucide-react/icons/asterisk";
import BoxIcon from "lucide-react/icons/box";
import BracesIcon from "lucide-react/icons/braces";
import BuildingIcon from "lucide-react/icons/building";
import Building2Icon from "lucide-react/icons/building-2";
import CalendarIcon from "lucide-react/icons/calendar";
import ChartNoAxesGanttIcon from "lucide-react/icons/chart-no-axes-gantt";
import CheckIcon from "lucide-react/icons/check";
import CircleHelp from "lucide-react/icons/circle-help";
import DotIcon from "lucide-react/icons/dot";
import EllipsisIcon from "lucide-react/icons/ellipsis";
import GlobeIcon from "lucide-react/icons/globe";
import HashIcon from "lucide-react/icons/hash";
import ImageIcon from "lucide-react/icons/image";
import LayoutGridIcon from "lucide-react/icons/layout-grid";
import LockIcon from "lucide-react/icons/lock";
import MinusIcon from "lucide-react/icons/minus";
import MusicIcon from "lucide-react/icons/music";
import ShapesIcon from "lucide-react/icons/shapes";
import SquareIcon from "lucide-react/icons/square";
import StickyNoteIcon from "lucide-react/icons/sticky-note";
import TriangleIcon from "lucide-react/icons/triangle";
import TypeIcon from "lucide-react/icons/type";
import WrenchIcon from "lucide-react/icons/wrench";
import XIcon from "lucide-react/icons/x";
import { createElement, memo, useState } from "react";

import { NodeDocsDialog } from "@/components/docs/node-docs-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNodeTypes } from "@/services/type-service";
import { cn } from "@/utils/utils";

import { PropertyField } from "./fields";
import { registry } from "./widgets";
import {
  clearNodeInput,
  convertValueByType,
  updateNodeInput,
  useWorkflow,
} from "./workflow-context";
import { ToolReference, WorkflowToolSelector } from "./workflow-tool-selector";
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
  parameter,
  onInputClick,
  onOutputClick,
  disabled,
  className,
  size: _size = "sm",
  executionState = "idle",
  selected = false,
}: {
  type: InputOutputType;
  position: Position;
  id: string;
  parameter?: WorkflowParameter;
  onInputClick?: (param: WorkflowParameter, element: HTMLElement) => void;
  onOutputClick?: (param: WorkflowParameter, element: HTMLElement) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  executionState?: NodeExecutionState;
  selected?: boolean;
}) => {
  const iconSize = "!size-2.5";

  const icon: Record<InputOutputType, React.ReactNode> = {
    string: <TypeIcon className={iconSize} />,
    number: <HashIcon className={iconSize} />,
    boolean: <CheckIcon className={iconSize} />,
    image: <ImageIcon className={iconSize} />,
    document: <StickyNoteIcon className={iconSize} />,
    audio: <MusicIcon className={iconSize} />,
    buffergeometry: <BoxIcon className={iconSize} />,
    gltf: <BoxIcon className={iconSize} />,
    json: <BracesIcon className={iconSize} />,
    date: <CalendarIcon className={iconSize} />,
    point: <DotIcon className={iconSize} />,
    multipoint: <EllipsisIcon className={iconSize} />,
    linestring: <MinusIcon className={iconSize} />,
    multilinestring: <ChartNoAxesGanttIcon className={iconSize} />,
    polygon: <TriangleIcon className={iconSize} />,
    multipolygon: <ShapesIcon className={iconSize} />,
    geometry: <SquareIcon className={iconSize} />,
    geometrycollection: <LayoutGridIcon className={iconSize} />,
    feature: <BuildingIcon className={iconSize} />,
    featurecollection: <Building2Icon className={iconSize} />,
    geojson: <GlobeIcon className={iconSize} />,
    secret: <LockIcon className={iconSize} />,
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
  // Check if the parameter is connected
  const isConnected = parameter?.isConnected === true;
  // Determine if this is an input parameter
  const isInput = position === Position.Left;

  // Check if this parameter accepts multiple connections
  const repeated = parameter?.repeated || false;

  return (
    <div className="relative inline-flex items-center justify-center">
      <Handle
        type={position === Position.Left ? "target" : "source"}
        position={position}
        id={id}
        className={cn(
          "!w-4 !h-4 !border !rounded-md !inline-flex !items-center !justify-center p transition-colors !shadow-sm",
          {
            "!bg-neutral-100 dark:!bg-neutral-800": hasValue,
            "!bg-white dark:!bg-neutral-900": !hasValue,
            "!border-blue-500": selected,
            "!border-border": !selected && executionState === "idle",
            "!border-yellow-400": executionState === "executing",
            "!border-green-500": executionState === "completed",
            "!border-red-500": executionState === "error",
            "!border-blue-400": executionState === "skipped",
          },
          className
        )}
        isConnectableStart={!disabled}
        isConnectable={!disabled}
        onClick={handleClick}
      >
        <span
          className={cn(
            "inline-flex items-center justify-center text-xs font-medium transition-colors pointer-events-none",
            {
              "text-neutral-800 dark:text-neutral-300": isConnected || hasValue,
              "text-neutral-600 dark:text-neutral-400":
                !isConnected && (!isInput || !hasValue),
            }
          )}
        >
          {icon[type]}
        </span>
      </Handle>
      {/* Multiple connections indicator */}
      {isInput && repeated && (
        <span className="absolute -bottom-1 -right-1 text-[8px] text-neutral-500 dark:text-neutral-400 pointer-events-none">
          ⋯
        </span>
      )}
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
    const { updateNodeData, disabled, nodeTemplates } = useWorkflow();
    const [isToolSelectorOpen, setIsToolSelectorOpen] = useState(false);
    const [isDocsOpen, setIsDocsOpen] = useState(false);
    const [activeInputId, setActiveInputId] = useState<string | null>(null);
    const [activeOutputId, setActiveOutputId] = useState<string | null>(null);

    // Get node type
    const nodeType = data.nodeType || "";

    // Load available node types for docs resolution
    const { nodeTypes } = useNodeTypes();

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
    const widget = nodeType ? registry.for(nodeType, id, data.inputs) : null;

    const handleWidgetChange = (value: any) => {
      if (disabled || !updateNodeData || !widget) return;

      const input = data.inputs.find((i) => i.id === widget.inputField);
      if (input) {
        updateNodeInput(id, input.id, value, data.inputs, updateNodeData);
      }
    };

    const handleToolSelectorClose = () => {
      setIsToolSelectorOpen(false);
    };

    const handleToolsSelect = (tool: ToolReference) => {
      if (disabled || !updateNodeData) return;

      // Get current tools and add the new one
      const currentTools = getCurrentSelectedTools();

      // Check if tool is already in the list
      if (currentTools.some((t) => t.identifier === tool.identifier)) {
        return;
      }

      const updatedTools = [...currentTools, tool];

      // Find the tools input parameter
      const toolsInput = data.inputs.find((input) => input.id === "tools");
      if (toolsInput) {
        updateNodeInput(
          id,
          toolsInput.id,
          updatedTools,
          data.inputs,
          updateNodeData
        );
      }
    };

    const handleRemoveTool = (toolIdentifier: string) => {
      if (disabled || !updateNodeData) return;

      const currentTools = getCurrentSelectedTools();
      const updatedTools = currentTools.filter(
        (t) => t.identifier !== toolIdentifier
      );

      const toolsInput = data.inputs.find((input) => input.id === "tools");
      if (toolsInput) {
        updateNodeInput(
          id,
          toolsInput.id,
          updatedTools,
          data.inputs,
          updateNodeData
        );
      }
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
      if (param.isConnected) return;
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
          className={cn(
            "bg-card shadow-sm w-[220px] rounded-md border transition-colors",
            {
              "border-blue-500": selected,
              "border-border": !selected && data.executionState === "idle",
              "border-yellow-400": data.executionState === "executing",
              "border-green-500": data.executionState === "completed",
              "border-red-500": data.executionState === "error",
              "border-blue-400": data.executionState === "skipped",
            }
          )}
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
            <button
              type="button"
              className={cn(
                "nodrag p-1 rounded transition-colors",
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
          {!disabled && widget && (
            <div className="px-0 py-0 nodrag border-b">
              {createElement(widget.Component, {
                ...widget.config,
                onChange: handleWidgetChange,
                disabled,
              })}
            </div>
          )}

          {/* Tools bar (between header and body) */}
          {data.functionCalling && (
            <div className="px-2 py-2 nodrag border-b space-y-2">
              <button
                type="button"
                className={cn(
                  "w-full px-2 py-1 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5",
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
              {(() => {
                const selectedTools = getCurrentSelectedTools();
                if (selectedTools.length > 0) {
                  // Sort tools by name
                  const sortedTools = [...selectedTools].sort((a, b) => {
                    const tplA = (nodeTemplates || []).find(
                      (t) => t.id === a.identifier
                    );
                    const tplB = (nodeTemplates || []).find(
                      (t) => t.id === b.identifier
                    );
                    const nameA = tplA?.name || a.identifier;
                    const nameB = tplB?.name || b.identifier;
                    return nameA.localeCompare(nameB);
                  });

                  return (
                    <div className="space-y-1">
                      {sortedTools.map((tool, idx) => {
                        const tpl = (nodeTemplates || []).find(
                          (t) => t.id === tool.identifier
                        );
                        return (
                          <div
                            key={`${tool.identifier}-${idx}`}
                            className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-neutral-100 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 w-full"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {tpl?.icon ? (
                                <DynamicIcon
                                  name={tpl.icon as any}
                                  className="h-3 w-3 shrink-0"
                                />
                              ) : null}
                              <span className="truncate">
                                {tpl?.name || tool.identifier}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="shrink-0 text-neutral-400 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-neutral-100 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveTool(tool.identifier);
                              }}
                              disabled={disabled}
                              aria-label="Remove tool"
                            >
                              <XIcon className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                return null;
              })()}
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
                      parameter={input}
                      onInputClick={handleInputClick}
                      disabled={disabled}
                      executionState={data.executionState}
                      selected={selected}
                    />
                    <span className="text-xs text-foreground font-medium font-mono truncate">
                      {input.name}
                      {input.repeated && (
                        <span className="text-neutral-500 dark:text-neutral-400 ml-1">
                          *
                        </span>
                      )}
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

        {data.functionCalling && (
          <WorkflowToolSelector
            open={isToolSelectorOpen}
            onClose={handleToolSelectorClose}
            onSelect={handleToolsSelect}
            templates={nodeTemplates || []}
          />
        )}

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
          <DialogContent className="sm:max-w-md pt-4">
            {activeInputId &&
              (() => {
                const activeInput = data.inputs.find(
                  (i) => i.id === activeInputId
                );
                if (!activeInput) return null;

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
                    connected={activeInput.isConnected}
                    createObjectUrl={data.createObjectUrl}
                  />
                );
              })()}
          </DialogContent>
        </Dialog>

        <Dialog
          open={activeOutputId !== null}
          onOpenChange={(open) => !open && setActiveOutputId(null)}
        >
          <DialogContent className="sm:max-w-md pt-4">
            {activeOutputId &&
              (() => {
                const activeOutput = data.outputs.find(
                  (o) => o.id === activeOutputId
                );
                if (!activeOutput) return null;

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
                    disabled={true}
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
