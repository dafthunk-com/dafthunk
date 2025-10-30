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
import { createElement, memo, useEffect, useRef, useState } from "react";

import { NodeDocsDialog } from "@/components/docs/node-docs-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNodeTypes } from "@/services/type-service";
import { cn } from "@/utils/utils";

import { registry } from "./widgets";
import { updateNodeInput, useWorkflow } from "./workflow-context";
import { WorkflowNodeInput } from "./workflow-node-input";
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
  disabled,
  className,
  size = "sm",
  executionState = "idle",
  selected = false,
}: {
  type: InputOutputType;
  position: Position;
  id: string;
  parameter?: WorkflowParameter;
  onInputClick?: (param: WorkflowParameter, element: HTMLElement) => void;
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
        className={cn(
          "!w-4 !h-4 !border !rounded-md !inline-flex !items-center !justify-center p transition-colors",
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
              "text-neutral-600 dark:text-neutral-400": !isConnected && (!isInput || !hasValue),
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
    const { updateNodeData, disabled, expandedOutputs } = useWorkflow();
    const [showOutputs, setShowOutputs] = useState(false);
    const [showError, setShowError] = useState(false);
    const [isToolSelectorOpen, setIsToolSelectorOpen] = useState(false);
    const [isDocsOpen, setIsDocsOpen] = useState(false);
    const [activeInputId, setActiveInputId] = useState<string | null>(null);
    const inputContainerRefs = useRef<Map<string, React.RefObject<HTMLDivElement | null>>>(new Map());
    const handleRefs = useRef<Map<string, HTMLElement>>(new Map());
    const hasVisibleOutputs = data.outputs.some((output) => !output.hidden);
    const canShowOutputs =
      hasVisibleOutputs && data.executionState === "completed";

    // Initialize showOutputs and showError based on expandedOutputs
    useEffect(() => {
      setShowOutputs(hasVisibleOutputs && !!expandedOutputs);
      setShowError(!!expandedOutputs);
    }, [expandedOutputs, hasVisibleOutputs]);

    // Handle click outside to close active input
    useEffect(() => {
      if (!activeInputId) return;

      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const containerRef = inputContainerRefs.current.get(activeInputId);
        const handleElement = handleRefs.current.get(activeInputId);

        // Check if click is inside the input container
        const isInsideContainer = containerRef?.current?.contains(target);
        // Check if click is on the handle itself
        const isOnHandle = handleElement?.contains(target);

        // If click is outside both the input container and the handle, close it
        // If click is on the handle, let the handle's onClick manage the toggle
        if (!isInsideContainer && !isOnHandle) {
          setActiveInputId(null);
        }
      };

      // Use capture phase to catch the event before ReactFlow handles it
      document.addEventListener('mousedown', handleClickOutside, true);
      return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [activeInputId]);

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

    const handleToolsSelect = (tools: ToolReference[]) => {
      if (disabled || !updateNodeData) return;

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

    const handleInputClick = (param: WorkflowParameter, element: HTMLElement) => {
      if (disabled) return;
      // Don't allow clicking on connected inputs
      if (param.isConnected) return;
      handleRefs.current.set(param.id, element);
      // Toggle: if this input is already active, close it; otherwise open it
      setActiveInputId(activeInputId === param.id ? null : param.id);
    };

    // Create or get ref for input container
    const getInputContainerRef = (inputId: string) => {
      if (!inputContainerRefs.current.has(inputId)) {
        const ref = { current: null as HTMLDivElement | null };
        inputContainerRefs.current.set(inputId, ref);
      }
      return inputContainerRefs.current.get(inputId)!;
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
            <div
              className="px-1 py-1 nodrag flex flex-wrap items-start gap-1 border-b"
              onClick={(e) => {
                e.stopPropagation();
                if (disabled) return;
                setIsToolSelectorOpen(true);
              }}
            >
              {(() => {
                const selectedTools = getCurrentSelectedTools();
                if (!selectedTools.length) {
                  return (
                    <span className="text-xs text-neutral-500">
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
                          className="inline-flex items-center gap-1 px-1 py-[2px] rounded bg-neutral-100 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
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
                    <span className="text-xs text-blue-500 ml-1">Edit</span>
                  </div>
                );
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
                    {activeInputId === input.id && !input.isConnected && (
                      <WorkflowNodeInput
                        nodeId={id}
                        nodeInputs={data.inputs}
                        input={input}
                        disabled={disabled}
                        containerRef={getInputContainerRef(input.id)}
                        autoFocus={true}
                        onBlur={() => setActiveInputId(null)}
                        active={true}
                      />
                    )}
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
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 overflow-hidden text-ellipsis">
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
            <div className="flex flex-col gap-1 flex-1 items-end">
              {data.outputs
                .filter((output) => !output.hidden)
                .map((output, index) => (
                  <div
                    key={`output-${output.id}-${index}`}
                    className="flex items-center gap-3 text-xs relative"
                  >
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 overflow-hidden text-ellipsis">
                      {output.name}
                    </p>
                    <TypeBadge
                      type={output.type}
                      position={Position.Right}
                      id={output.id}
                      parameter={output}
                      disabled={disabled}
                      executionState={data.executionState}
                      selected={selected}
                    />
                  </div>
                ))}
            </div>
          </div>

          {/* Output Values Section */}
          {canShowOutputs && (
            <>
              <div
                className="py-2 px-2 border-t flex items-center justify-between nodrag cursor-pointer transition-colors"
                onClick={() => setShowOutputs(!showOutputs)}
              >
                <span className="text-xs font-bold  text-neutral-600 dark:text-neutral-400">
                  Outputs
                </span>
                {showOutputs ? (
                  <ChevronDown className="h-3 w-3 text-neutral-500" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-neutral-500 -rotate-90" />
                )}
              </div>

              {showOutputs && (
                <div className="px-2 pb-2 space-y-3 nodrag">
                  {data.outputs
                    .filter((output) => !output.hidden)
                    .map((output, index) => (
                      <div
                        key={`output-value-${output.id}-${index}`}
                        className="text-sm space-y-1"
                      >
                        {/* Output Header */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-muted-foreground shrink-0">
                            {(() => {
                              const iconSize = "h-3 w-3";
                              const icons: Record<InputOutputType, React.ReactNode> = {
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
                              };
                              return icons[output.type] || icons.any;
                            })()}
                          </span>
                          <span className="text-foreground font-medium font-mono truncate text-xs">
                            {output.name}
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
                className="py-2 px-2 border-t flex items-center justify-between nodrag cursor-pointer transition-colors"
                onClick={() => setShowError(!showError)}
              >
                <span className="text-xs font-bold text-foreground">
                  Error
                </span>
                {showError ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-muted-foreground -rotate-90" />
                )}
              </div>

              {showError && (
                <div className="px-2 pb-2 nodrag overflow-auto">
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {data.error}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

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
