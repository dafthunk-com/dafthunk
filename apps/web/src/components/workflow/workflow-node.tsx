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
import ChevronUp from "lucide-react/icons/chevron-up";
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

import { InputEditDialog } from "./input-edit-dialog";
import { AudioRecorderWidget } from "./widgets/audio-recorder-widget";
import { CanvasDoodleWidget } from "./widgets/canvas-doodle-widget";
import { DatasetSelectorWidget } from "./widgets/dataset-selector-widget";
import { DocumentWidget } from "./widgets/document-widget";
import { InputTextWidget } from "./widgets/input-text-widget";
import { IntegrationSelectorWidget } from "./widgets/integration-selector-widget";
import { JavaScriptEditorWidget } from "./widgets/javascript-editor-widget";
import { JsonEditorWidget } from "./widgets/json-editor-widget";
import { NumberInputWidget } from "./widgets/number-input-widget";
import { SliderWidget } from "./widgets/slider-widget";
import { TextAreaWidget } from "./widgets/text-area-widget";
import { WebcamWidget } from "./widgets/webcam-widget";
import { createWidgetConfig } from "./widgets/widget-factory";
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

const TypeBadge = ({
  type,
  position,
  id,
  parameter,
  onInputClick,
  readonly,
}: {
  type: InputOutputType;
  position: Position;
  id: string;
  parameter?: WorkflowParameter;
  onInputClick?: (param: WorkflowParameter) => void;
  readonly?: boolean;
}) => {
  const icon: Record<InputOutputType, React.ReactNode> = {
    string: <TypeIcon className="!size-3" />,
    number: <HashIcon className="!size-3" />,
    boolean: <CheckIcon className="!size-3" />,
    image: <ImageIcon className="!size-3" />,
    document: <StickyNoteIcon className="!size-3" />,
    audio: <MusicIcon className="!size-3" />,
    buffergeometry: <BoxIcon className="!size-3" />,
    gltf: <BoxIcon className="!size-3" />,
    json: <BracesIcon className="!size-3" />,
    date: <CalendarIcon className="!size-3" />,
    point: <DotIcon className="!size-3" />,
    multipoint: <EllipsisIcon className="!size-3" />,
    linestring: <MinusIcon className="!size-3" />,
    multilinestring: <ChartNoAxesGanttIcon className="!size-3" />,
    polygon: <TriangleIcon className="!size-3" />,
    multipolygon: <ShapesIcon className="!size-3" />,
    geometry: <SquareIcon className="!size-3" />,
    geometrycollection: <LayoutGridIcon className="!size-3" />,
    feature: <BuildingIcon className="!size-3" />,
    featurecollection: <Building2Icon className="!size-3" />,
    geojson: <GlobeIcon className="!size-3" />,
    secret: <LockIcon className="!size-3" />,
    any: <AsteriskIcon className="!size-3" />,
  } satisfies Record<InputOutputType, React.ReactNode>;

  const handleClick = (e: React.MouseEvent) => {
    if (readonly) return;

    if (position === Position.Left && parameter && onInputClick) {
      e.stopPropagation();
      onInputClick(parameter);
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
          "inline-flex items-center justify-center w-5 h-5 rounded text-xs font-medium relative z-[1] transition-colors",
          // Base styles are the same for readonly and interactive
          {
            // Connected:
            "bg-neutral-400 text-neutral-800 dark:bg-neutral-300 dark:text-neutral-900":
              isConnected,
            // Has Value:
            "bg-neutral-300 text-neutral-700 dark:bg-neutral-600 dark:text-neutral-200":
              isInput && !isConnected && hasValue,
            // Default:
            "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400":
              !isConnected && (!isInput || !hasValue),
          },
          // Interactive styles (hover and cursor) are applied conditionally
          !readonly && {
            "cursor-pointer": true,
            // Connected (Interactive) hover
            "hover:bg-neutral-600 dark:hover:bg-neutral-200": isConnected,
            // Has Value (Interactive) hover
            "hover:bg-neutral-500 dark:hover:bg-neutral-500":
              isInput && !isConnected && hasValue,
            // Default (Interactive) hover
            "hover:bg-neutral-400 dark:hover:bg-neutral-700":
              !isConnected && (!isInput || !hasValue),
          },
          // Readonly styles
          readonly && "cursor-default"
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
    const [showError, setShowError] = useState(true);
    const [isToolSelectorOpen, setIsToolSelectorOpen] = useState(false);
    const [isDocsOpen, setIsDocsOpen] = useState(false);
    const hasVisibleOutputs = data.outputs.some((output) => !output.hidden);
    const canShowOutputs =
      hasVisibleOutputs &&
      ["completed", "error", "skipped"].includes(data.executionState);
    const [selectedInput, setSelectedInput] =
      useState<WorkflowParameter | null>(null);

    // Initialize showOutputs based on expandedOutputs and hasVisibleOutputs
    useEffect(() => {
      setShowOutputs(hasVisibleOutputs && !!expandedOutputs);
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

    // Widget mapping
    const widgetComponents: Record<
      string,
      React.FC<{
        config: any;
        onChange: (value: any) => void;
        compact?: boolean;
        readonly?: boolean;
      }>
    > = {
      slider: SliderWidget,
      "text-area": TextAreaWidget,
      "input-text": InputTextWidget,
      "number-input": NumberInputWidget,
      "json-editor": JsonEditorWidget,
      "javascript-editor": JavaScriptEditorWidget,
      "canvas-doodle": CanvasDoodleWidget,
      webcam: WebcamWidget,
      "audio-recorder": AudioRecorderWidget,
      document: DocumentWidget,
      "rag-ai-search": DatasetSelectorWidget,
      "rag-search": DatasetSelectorWidget,
      "send-email-google-mail": IntegrationSelectorWidget,
      "read-inbox-google-mail": IntegrationSelectorWidget,
      "create-reply-draft-google-mail": IntegrationSelectorWidget,
      "check-draft-google-mail": IntegrationSelectorWidget,
      "send-draft-google-mail": IntegrationSelectorWidget,
      "delete-draft-google-mail": IntegrationSelectorWidget,
      "update-draft-google-mail": IntegrationSelectorWidget,
      "mark-message-google-mail": IntegrationSelectorWidget,
      "modify-labels-google-mail": IntegrationSelectorWidget,
      "search-messages-google-mail": IntegrationSelectorWidget,
      "get-message-google-mail": IntegrationSelectorWidget,
      "archive-message-google-mail": IntegrationSelectorWidget,
      "trash-message-google-mail": IntegrationSelectorWidget,
      "create-event-google-calendar": IntegrationSelectorWidget,
      "list-events-google-calendar": IntegrationSelectorWidget,
      "get-event-google-calendar": IntegrationSelectorWidget,
      "update-event-google-calendar": IntegrationSelectorWidget,
      "delete-event-google-calendar": IntegrationSelectorWidget,
      "search-events-google-calendar": IntegrationSelectorWidget,
      "add-attendees-google-calendar": IntegrationSelectorWidget,
      "check-availability-google-calendar": IntegrationSelectorWidget,
      "quick-add-google-calendar": IntegrationSelectorWidget,
      "list-calendars-google-calendar": IntegrationSelectorWidget,
      "send-message-discord": IntegrationSelectorWidget,
      "send-dm-discord": IntegrationSelectorWidget,
      "get-channel-discord": IntegrationSelectorWidget,
      "list-guild-channels-discord": IntegrationSelectorWidget,
      "get-guild-discord": IntegrationSelectorWidget,
      "list-user-guilds-discord": IntegrationSelectorWidget,
      "add-reaction-discord": IntegrationSelectorWidget,
    };

    // Get widget configuration if this is a widget node
    const widgetConfig =
      nodeType && widgetComponents[nodeType]
        ? createWidgetConfig(id, data.inputs, nodeType)
        : null;

    const handleWidgetChange = (value: any) => {
      if (readonly || !updateNodeData || !widgetConfig) return;

      // Handle dataset selector specifically
      if (nodeType === "rag-ai-search" || nodeType === "rag-search") {
        const datasetIdInput = data.inputs.find((i) => i.id === "datasetId");
        if (datasetIdInput) {
          updateNodeInput(
            id,
            datasetIdInput.id,
            value,
            data.inputs,
            updateNodeData
          );
        }
        return;
      }

      // Handle integration selector specifically
      if (
        nodeType === "send-email-google-mail" ||
        nodeType === "read-inbox-google-mail" ||
        nodeType === "create-reply-draft-google-mail" ||
        nodeType === "check-draft-google-mail" ||
        nodeType === "send-draft-google-mail" ||
        nodeType === "delete-draft-google-mail" ||
        nodeType === "update-draft-google-mail" ||
        nodeType === "mark-message-google-mail" ||
        nodeType === "modify-labels-google-mail" ||
        nodeType === "search-messages-google-mail" ||
        nodeType === "get-message-google-mail" ||
        nodeType === "archive-message-google-mail" ||
        nodeType === "trash-message-google-mail" ||
        nodeType === "create-event-google-calendar" ||
        nodeType === "list-events-google-calendar" ||
        nodeType === "get-event-google-calendar" ||
        nodeType === "update-event-google-calendar" ||
        nodeType === "delete-event-google-calendar" ||
        nodeType === "search-events-google-calendar" ||
        nodeType === "add-attendees-google-calendar" ||
        nodeType === "check-availability-google-calendar" ||
        nodeType === "quick-add-google-calendar" ||
        nodeType === "list-calendars-google-calendar" ||
        nodeType === "send-message-discord" ||
        nodeType === "send-dm-discord" ||
        nodeType === "get-channel-discord" ||
        nodeType === "list-guild-channels-discord" ||
        nodeType === "get-guild-discord" ||
        nodeType === "list-user-guilds-discord" ||
        nodeType === "add-reaction-discord"
      ) {
        const integrationIdInput = data.inputs.find(
          (i) => i.id === "integrationId"
        );
        if (integrationIdInput) {
          updateNodeInput(
            id,
            integrationIdInput.id,
            value,
            data.inputs,
            updateNodeData
          );
        }
        return;
      }

      // Handle other widgets
      const valueInput = data.inputs.find((i) => i.id === "value");
      if (valueInput) {
        updateNodeInput(id, valueInput.id, value, data.inputs, updateNodeData);
      }
    };

    const handleInputClick = (input: WorkflowParameter) => {
      if (readonly) return;
      setSelectedInput(input);
    };

    const handleDialogClose = () => {
      setSelectedInput(null);
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
              "px-1 py-1 flex justify-between items-center border-b hover:cursor-grab active:cursor-grabbing",
              "workflow-node-drag-handle"
            )}
          >
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <DynamicIcon
                name={data.icon as any}
                className="mx-1 h-3 w-3 text-blue-500 shrink-0"
              />
              <h3 className="text-xs font-medium truncate">{data.name}</h3>
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

          {/* Widget */}
          {!readonly &&
            widgetConfig &&
            nodeType &&
            widgetComponents[nodeType] && (
              <div className="px-0 py-0 border-b nodrag">
                {createElement(widgetComponents[nodeType], {
                  config: widgetConfig,
                  onChange: handleWidgetChange,
                  compact: true,
                  readonly: readonly,
                })}
              </div>
            )}

          {/* Parameters */}
          <div className="px-1 py-1 grid grid-cols-2 justify-between gap-1 nodrag">
            {/* Input Parameters */}
            <div className="flex flex-col gap-1 flex-1">
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
                    <p className="overflow-hidden text-ellipsis">
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
                    className="flex items-center gap-1 text-xs relative"
                  >
                    <p className="overflow-hidden text-ellipsis">
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
                className="px-2 py-1 border-t flex items-center justify-between nodrag cursor-pointer hover:bg-secondary/50"
                onClick={() => setShowOutputs(!showOutputs)}
              >
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Outputs
                </span>
                {showOutputs ? (
                  <ChevronUp className="h-3 w-3 text-neutral-500" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-neutral-500" />
                )}
              </div>

              {showOutputs && (
                <div className="p-2 border-t space-y-2 nodrag">
                  {data.outputs
                    .filter((output) => !output.hidden)
                    .map((output, index) => (
                      <div
                        key={`output-value-${output.id}-${index}`}
                        className="space-y-1"
                      >
                        <div className="text-xs font-medium flex items-center gap-2">
                          <span>{output.name}</span>
                          <span className="text-xs text-neutral-500">
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
                className="px-2 py-1 border-t flex items-center justify-between nodrag cursor-pointer hover:bg-red-100 dark:hover:bg-red-950 transition-colors"
                onClick={() => setShowError(!showError)}
              >
                <span className="text-xs font-medium text-red-600 dark:text-red-400">
                  Error
                </span>
                {showError ? (
                  <ChevronUp className="h-3 w-3 text-red-500" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-red-500" />
                )}
              </div>

              {showError && (
                <div className="p-2 bg-red-50 text-red-600 text-xs border-t border-red-200 dark:bg-red-900 dark:text-red-400 dark:border-red-800 nodrag">
                  <p className="m-0">{data.error}</p>
                </div>
              )}
            </>
          )}
        </div>

        <InputEditDialog
          nodeId={id}
          nodeInputs={data.inputs}
          input={selectedInput}
          isOpen={selectedInput !== null && !readonly}
          onClose={handleDialogClose}
          readonly={readonly}
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
