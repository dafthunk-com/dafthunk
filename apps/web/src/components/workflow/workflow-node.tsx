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
import ChevronDown from "lucide-react/icons/chevron-down";
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
import { createElement, memo, useEffect, useState } from "react";

import { NodeDocsDialog } from "@/components/docs/node-docs-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNodeTypes } from "@/services/type-service";
import { cn } from "@/utils/utils";

import { InputEditPopover } from "./input-edit-popover";
import { registry } from "./widgets";
import { updateNodeInput, useWorkflow } from "./workflow-context";
import { WorkflowOutputRenderer } from "./workflow-output-renderer";
import { ToolReference, WorkflowToolSelector } from "./workflow-tool-selector";
import {
  InputOutputType,
  NodeExecutionState,
  NodeTemplate,
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
  nodeTemplates?: NodeTemplate[];
}

export const TypeBadge = ({
  type,
  position,
  id,
  parameter,
  onInputClick,
  readonly,
  className,
  size = "sm",
}: {
  type: InputOutputType;
  position: Position;
  id: string;
  parameter?: WorkflowParameter;
  onInputClick?: (param: WorkflowParameter, element: HTMLElement) => void;
  readonly?: boolean;
  className?: string;
  size?: "sm" | "md";
}) => {
  const iconSize = size === "md" ? "!size-3" : "!size-2";

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
    if (readonly) return;

    if (position === Position.Left && parameter && onInputClick) {
      e.stopPropagation();
      onInputClick(parameter, e.currentTarget);
    }
  };

  // Check if the parameter has a value set (only for input parameters)
  const hasValue =
    position === Position.Left && parameter && parameter.value !== undefined;
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
        className="opacity-0 !w-full !h-full !bg-transparent !border-none !absolute !left-0 !top-0 !transform-none !m-0 !z-[1000]"
        isConnectableStart={position !== Position.Left && !readonly}
        isConnectable={!readonly}
      />
      <span
        className={cn(
          "inline-flex items-center justify-center text-xs font-medium relative z-[1] transition-colors",
          size === "md" ? "size-5" : "size-3.5",
          isInput ? "rounded-e-[0.3rem]" : "rounded-s-[0.3rem]",
          // Base styles are the same for readonly and interactive
          {
            // Connected:
            "bg-neutral-400 text-neutral-800 dark:bg-neutral-300 dark:text-neutral-900":
              isConnected || hasValue,
            // Default:
            "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400":
              !isConnected && (!isInput || !hasValue),
          },
          // Interactive styles (hover and cursor) are applied conditionally
          !readonly && {
            "cursor-pointer": true,
            // Connected (Interactive) hover
            "hover:bg-neutral-600 dark:hover:bg-neutral-200":
              isConnected || hasValue,
            // Default (Interactive) hover
            "hover:bg-neutral-400 dark:hover:bg-neutral-700":
              !isConnected && (!isInput || !hasValue),
          },
          // Readonly styles
          readonly && "cursor-default",
          className
        )}
        onClick={handleClick}
      >
        {icon[type]}
      </span>
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
    const { updateNodeData, readonly, expandedOutputs } = useWorkflow();
    const [showOutputs, setShowOutputs] = useState(false);
    const [showError, setShowError] = useState(false);
    const [isToolSelectorOpen, setIsToolSelectorOpen] = useState(false);
    const [isDocsOpen, setIsDocsOpen] = useState(false);
    const hasVisibleOutputs = data.outputs.some((output) => !output.hidden);
    const canShowOutputs =
      hasVisibleOutputs && data.executionState === "completed";
    const [selectedInput, setSelectedInput] =
      useState<WorkflowParameter | null>(null);
    const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(
      null
    );

    // Initialize showOutputs and showError based on expandedOutputs
    useEffect(() => {
      setShowOutputs(hasVisibleOutputs && !!expandedOutputs);
      setShowError(!!expandedOutputs);
    }, [expandedOutputs, hasVisibleOutputs]);

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
      if (readonly || !updateNodeData || !widget) return;

      const input = data.inputs.find((i) => i.id === widget.inputField);
      if (input) {
        updateNodeInput(id, input.id, value, data.inputs, updateNodeData);
      }
    };

    const handleInputClick = (
      input: WorkflowParameter,
      element: HTMLElement
    ) => {
      if (readonly) return;
      setSelectedInput(input);
      setAnchorElement(element);
    };

    const handleDialogClose = () => {
      setSelectedInput(null);
      setAnchorElement(null);
    };

    const handleToolSelectorClose = () => {
      setIsToolSelectorOpen(false);
    };

    const handleToolsSelect = (tools: ToolReference[]) => {
      if (readonly || !updateNodeData) return;

      // Find the tools input parameter
      const toolsInput = data.inputs.find((input) => input.id === "tools");
      if (toolsInput) {
        updateNodeInput(id, toolsInput.id, tools, data.inputs, updateNodeData);
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

    return (
      <TooltipProvider>
        <div
          className={cn(
            "bg-card shadow-sm w-[200px] rounded-md border transition-colors overflow-hidden",
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
              "px-0.5 flex justify-between items-center bg-neutral-100 dark:bg-neutral-900 border-b hover:cursor-grab active:cursor-grabbing",
              "workflow-node-drag-handle"
            )}
          >
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <DynamicIcon
                name={data.icon as any}
                className="mx-1 h-3 w-3 text-blue-500 shrink-0"
              />
              <h3 className="text-xs font-normal truncate">{data.name}</h3>
            </div>
            <button
              type="button"
              className={cn(
                "nodrag p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors",
                "text-neutral-500"
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
          {!readonly && widget && (
            <div className="px-0 py-0 border-b nodrag">
              {createElement(widget.Component, {
                ...widget.config,
                onChange: handleWidgetChange,
                compact: true,
                readonly: readonly,
              })}
            </div>
          )}

          {/* Tools bar (between header and body) */}
          {data.functionCalling && (
            <div
              className="px-1 py-1 border-b nodrag flex flex-wrap items-start gap-1"
              onClick={(e) => {
                e.stopPropagation();
                if (readonly) return;
                setIsToolSelectorOpen(true);
              }}
            >
              {(() => {
                const selectedTools = getCurrentSelectedTools();
                if (!selectedTools.length) {
                  return (
                    <span className="text-[10px] text-neutral-500">
                      Click to select tools
                    </span>
                  );
                }

                return (
                  <div className="flex flex-wrap items-center gap-1">
                    {selectedTools.map((tool, idx) => {
                      const tpl = (data.nodeTemplates || []).find(
                        (t) => t.id === tool.identifier
                      );
                      return (
                        <span
                          key={`${tool.identifier}-${idx}`}
                          className="inline-flex items-center gap-1 px-1 py-[2px] rounded bg-neutral-100 text-[10px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                        >
                          {tpl?.icon ? (
                            <DynamicIcon
                              name={tpl.icon as any}
                              className="h-3 w-3"
                            />
                          ) : null}
                          <span className="truncate max-w-[84px]">
                            {tpl?.name || tool.identifier}
                          </span>
                        </span>
                      );
                    })}
                    <span className="text-[10px] text-blue-500 ml-1">Edit</span>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Parameters */}
          <div className="py-1 grid grid-cols-2 justify-between gap-1 nodrag">
            {/* Input Parameters */}
            <div className="flex flex-col gap-[1px] flex-1">
              {data.inputs
                .filter((input) => !input.hidden)
                .map((input, index) => (
                  <div
                    key={`input-${input.id}-${index}`}
                    className="flex items-center gap-1 text-xs relative"
                  >
                    <TypeBadge
                      type={input.type}
                      position={Position.Left}
                      id={input.id}
                      parameter={input}
                      onInputClick={handleInputClick}
                      readonly={readonly}
                    />
                    <p className="text-[0.6rem] text-neutral-700 dark:text-neutral-300 overflow-hidden text-ellipsis">
                      {input.name}
                      {input.repeated && (
                        <span className="text-neutral-500 dark:text-neutral-400 ml-1">
                          *
                        </span>
                      )}
                    </p>
                  </div>
                ))}
            </div>

            {/* Output Parameters */}
            <div className="flex flex-col gap-[1px] flex-1 items-end">
              {data.outputs
                .filter((output) => !output.hidden)
                .map((output, index) => (
                  <div
                    key={`output-${output.id}-${index}`}
                    className="flex items-center gap-1 text-xs relative"
                  >
                    <p className="text-[0.6rem] text-neutral-700 dark:text-neutral-300 overflow-hidden text-ellipsis">
                      {output.name}
                    </p>
                    <TypeBadge
                      type={output.type}
                      position={Position.Right}
                      id={output.id}
                      parameter={output}
                      readonly={readonly}
                    />
                  </div>
                ))}
            </div>
          </div>

          {/* Output Values Section */}
          {canShowOutputs && (
            <>
              <div
                className="py-0.5 px-2 border-t flex items-center justify-between nodrag cursor-pointer bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                onClick={() => setShowOutputs(!showOutputs)}
              >
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Outputs
                </span>
                {showOutputs ? (
                  <ChevronDown className="h-3 w-3 text-neutral-500" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-neutral-500 -rotate-90" />
                )}
              </div>

              {showOutputs && (
                <div className="p-2 pt-1 border-t space-y-2 nodrag">
                  {data.outputs
                    .filter((output) => !output.hidden)
                    .map((output, index) => (
                      <div
                        key={`output-value-${output.id}-${index}`}
                        className="text-sm"
                      >
                        {/* Output Header */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-foreground font-medium truncate text-[0.6rem]">
                            {output.name}
                          </span>
                          <span className="text-[0.6rem] text-muted-foreground shrink-0">
                            {output.type}
                          </span>
                        </div>

                        <WorkflowOutputRenderer
                          output={output}
                          createObjectUrl={data.createObjectUrl}
                          compact={true}
                        />
                      </div>
                    ))}
                </div>
              )}
            </>
          )}

          {/* Error Display - Collapsible */}
          {data.error && (
            <>
              <div
                className="py-0.5 px-2 border-t flex items-center justify-between nodrag cursor-pointer bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                onClick={() => setShowError(!showError)}
              >
                <span className="text-xs font-medium text-red-600 dark:text-red-400">
                  Error
                </span>
                {showError ? (
                  <ChevronDown className="h-3 w-3 text-red-500" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-red-500 -rotate-90" />
                )}
              </div>

              {showError && (
                <div className="px-2 py-1 border-t nodrag">
                  <p className="text-[0.6rem] text-red-600 dark:text-red-400">
                    {data.error}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <InputEditPopover
          nodeId={id}
          nodeInputs={data.inputs}
          input={selectedInput}
          isOpen={selectedInput !== null && !readonly}
          onClose={handleDialogClose}
          readonly={readonly}
          anchorElement={anchorElement}
        />

        {data.functionCalling && (
          <WorkflowToolSelector
            open={isToolSelectorOpen}
            onClose={handleToolSelectorClose}
            onSelect={handleToolsSelect}
            templates={data.nodeTemplates || []}
            selectedTools={getCurrentSelectedTools()}
          />
        )}

        {resolvedNodeType && (
          <NodeDocsDialog
            nodeType={resolvedNodeType}
            isOpen={isDocsOpen}
            onOpenChange={setIsDocsOpen}
          />
        )}
      </TooltipProvider>
    );
  }
);

WorkflowNode.displayName = "WorkflowNode";
