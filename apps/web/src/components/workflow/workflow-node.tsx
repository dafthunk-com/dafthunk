import { ObjectReference } from "@dafthunk/types";
import { Handle, Position } from "@xyflow/react";
import { AsteriskIcon, BracesIcon, CheckIcon, ChevronDown, ChevronUp, FileIcon, FileImageIcon, FileJsonIcon, FileMusicIcon, FileTextIcon, HashIcon, ImageIcon,  MusicIcon,  StickyNoteIcon,  TextIcon, TypeIcon } from "lucide-react";
import { createElement, memo, useEffect, useState } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/utils/utils";

import { InputEditDialog } from "./input-edit-dialog";
import { AudioRecorderWidget } from "./widgets/audio-recorder-widget";
import { CanvasDoodleWidget } from "./widgets/canvas-doodle-widget";
import { DocumentWidget } from "./widgets/document-widget";
import { InputTextWidget } from "./widgets/input-text-widget";
import { JavaScriptEditorWidget } from "./widgets/javascript-editor-widget";
import { JsonEditorWidget } from "./widgets/json-editor-widget";
import { NumberInputWidget } from "./widgets/number-input-widget";
import { RadioGroupWidget } from "./widgets/radio-group-widget";
import { SliderWidget } from "./widgets/slider-widget";
import { TextAreaWidget } from "./widgets/text-area-widget";
import { WebcamWidget } from "./widgets/webcam-widget";
import { createWidgetConfig } from "./widgets/widget-factory";
import { updateNodeInput, useWorkflow } from "./workflow-context";
import { WorkflowOutputRenderer } from "./workflow-output-renderer";
import { InputOutputType, NodeExecutionState, WorkflowParameter } from "./workflow-types";

export interface WorkflowNodeType {
  name: string;
  inputs: WorkflowParameter[];
  outputs: WorkflowParameter[];
  error?: string | null;
  executionState: NodeExecutionState;
  nodeType?: string;
  dragHandle?: string;
  createObjectUrl: (objectReference: ObjectReference) => string;
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
  const icon = {
    "string": <TypeIcon className="!size-3" />,
    "number": <HashIcon className="!size-3" />,
    "boolean": <CheckIcon className="!size-3" />,
    "image": <ImageIcon className="!size-3" />,
    "document": <StickyNoteIcon className="!size-3" />,
    "audio": <MusicIcon className="!size-3" />,
    "json": <BracesIcon className="!size-3" />,
    "any": <AsteriskIcon className="!size-3" />,
  }[type];

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
        {icon}
      </span>
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
      "radio-group": RadioGroupWidget,
      "text-area": TextAreaWidget,
      "input-text": InputTextWidget,
      "number-input": NumberInputWidget,
      "json-editor": JsonEditorWidget,
      "javascript-editor": JavaScriptEditorWidget,
      "canvas-doodle": CanvasDoodleWidget,
      webcam: WebcamWidget,
      "audio-recorder": AudioRecorderWidget,
      document: DocumentWidget,
    };

    // Get widget configuration if this is a widget node
    const widgetConfig =
      nodeType && widgetComponents[nodeType]
        ? createWidgetConfig(id, data.inputs, nodeType)
        : null;

    const handleWidgetChange = (value: any) => {
      if (readonly || !updateNodeData || !widgetConfig) return;

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
              "px-1 py-1 flex justify-center items-center border-b hover:cursor-grab active:cursor-grabbing",
              "workflow-node-drag-handle"
            )}
          >
            <h3 className="text-xs font-medium truncate">{data.name}</h3>
          </div>

          {/* Widget */}
          {widgetConfig && nodeType && widgetComponents[nodeType] && (
            <div className="px-3 py-2 border-b nodrag">
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
                className="px-1 py-1 border-t flex items-center justify-between nodrag cursor-pointer hover:bg-secondary/50"
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
                <div className="px-1 pt-1 pb-2 border-t space-y-2">
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
                <div className="p-2 bg-red-50 text-red-600 text-xs border-t border-red-200 dark:bg-red-900 dark:text-red-400 dark:border-red-800">
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
      </TooltipProvider>
    );
  }
);

WorkflowNode.displayName = "WorkflowNode";
