import { ObjectReference } from "@dafthunk/types";
import { Handle, Position } from "@xyflow/react";
import { ChevronDown, ChevronUp, PencilIcon, XCircleIcon } from "lucide-react";
import { createElement, memo, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/utils/utils";

import { AudioRecorderWidget } from "./widgets/audio-recorder-widget";
import { CanvasDoodleWidget } from "./widgets/canvas-doodle-widget";
import { DocumentWidget } from "./widgets/document-widget";
import { InputTextWidget } from "./widgets/input-text-widget";
import { MonacoEditorWidget } from "./widgets/monaco-editor-widget";
import { NumberInputWidget } from "./widgets/number-input-widget";
import { RadioGroupWidget } from "./widgets/radio-group-widget";
import { SliderWidget } from "./widgets/slider-widget";
import { TextAreaWidget } from "./widgets/text-area-widget";
import { WebcamWidget } from "./widgets/webcam-widget";
import { createWidgetConfig } from "./widgets/widget-factory";
import {
  clearNodeInput,
  convertValueByType,
  updateNodeInput,
  updateNodeName,
  useWorkflow,
} from "./workflow-context";
import { WorkflowOutputRenderer } from "./workflow-output-renderer";
import { NodeExecutionState, WorkflowParameter } from "./workflow-types";

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
  type: string;
  position: Position;
  id: string;
  parameter?: WorkflowParameter;
  onInputClick?: (param: WorkflowParameter) => void;
  readonly?: boolean;
}) => {
  const name = type.charAt(0).toUpperCase();

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
          {
            // Dark gray for connected parameters (both input and output)
            "bg-neutral-400 text-neutral-900 hover:bg-neutral-500 dark:bg-neutral-500 dark:text-neutral-100 dark:hover:bg-neutral-600":
              isConnected && !readonly,
            // Medium gray for input parameters with values
            "bg-neutral-300 text-neutral-800 hover:bg-neutral-400 dark:bg-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700":
              isInput && !isConnected && hasValue && !readonly,
            // Light gray for unconnected parameters
            "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700":
              !isConnected && (!isInput || !hasValue) && !readonly,
            // Readonly styles - no hover effects
            "bg-neutral-400 text-neutral-900 dark:bg-neutral-500 dark:text-neutral-100 cursor-default":
              isConnected && readonly,
            "bg-neutral-300 text-neutral-800 dark:bg-neutral-600 dark:text-neutral-200 cursor-default":
              isInput && !isConnected && hasValue && readonly,
            "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 cursor-default":
              !isConnected && (!isInput || !hasValue) && readonly,
            "cursor-pointer": !readonly,
          }
        )}
        onClick={handleClick}
      >
        {name}
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
    const hasOutputValues = data.outputs.some(
      (output) => output.value !== undefined
    );
    const [selectedInput, setSelectedInput] =
      useState<WorkflowParameter | null>(null);
    const [inputValue, setInputValue] = useState<string>("");
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameValue, setNameValue] = useState(data.name);

    // Initialize showOutputs based on expandedOutputs and hasOutputValues
    useEffect(() => {
      if (expandedOutputs && hasOutputValues) {
        setShowOutputs(true);
      }
    }, [expandedOutputs, hasOutputValues]);

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
      "monaco-editor": MonacoEditorWidget,
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

    // Keep nameValue in sync with data.name when not editing
    useEffect(() => {
      if (!isEditingName) {
        setNameValue(data.name);
      }
    }, [data.name, isEditingName]);

    const handleInputClick = (input: WorkflowParameter) => {
      if (readonly) return;

      setSelectedInput(input);
      setInputValue(input.value !== undefined ? String(input.value) : "");
    };

    const handleInputChange = (value: string) => {
      if (readonly || !selectedInput) return;

      setInputValue(value);

      // Auto-save as the user types
      const typedValue = convertValueByType(value, selectedInput.type);
      updateNodeInput(
        id,
        selectedInput.id,
        typedValue,
        data.inputs,
        updateNodeData
      );
    };

    const handleClearValue = () => {
      if (readonly || !selectedInput) return;

      clearNodeInput(id, selectedInput.id, data.inputs, updateNodeData);
      setInputValue("");
    };

    const handleDialogClose = () => {
      setSelectedInput(null);
    };

    const handleNameClick = () => {
      if (readonly) return;

      setIsEditingName(true);
      setNameValue(data.name);
    };

    const handleNameSave = () => {
      if (readonly || nameValue.trim() === "") return;

      updateNodeName(id, nameValue, updateNodeData);
      setIsEditingName(false);
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
            }
          )}
        >
          {/* Header */}
          <div
            className={cn(
              "pl-2 pr-1 py-1 flex justify-between items-center border-b hover:cursor-grab active:cursor-grabbing",
              "workflow-node-drag-handle"
            )}
          >
            <h3 className="text-xs font-medium truncate">{data.name}</h3>
            <div className="flex gap-1">
              {!readonly && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleNameClick}
                      className="inline-flex items-center justify-center w-5 h-5 rounded bg-neutral-100 text-blue-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-blue-500 dark:hover:bg-neutral-700 nodrag"
                      aria-label="Edit node label"
                    >
                      <PencilIcon className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit Label</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
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
          <div className="px-1 py-1 grid grid-cols-2 justify-between gap-2.5 nodrag">
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

          {/* Output Values Section - Only shown when there are output values */}
          {hasOutputValues && (
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
                <div className="px-2 pt-1 pb-2 border-t space-y-2">
                  {data.outputs.map(
                    (output, index) =>
                      output.value !== undefined && (
                        <div
                          key={`output-value-${output.id}-${index}`}
                          className="space-y-1"
                        >
                          <div className="text-xs font-medium">
                            {output.name}
                          </div>
                          <div className="max-h-[300px] overflow-y-auto">
                            <WorkflowOutputRenderer
                              output={output}
                              createObjectUrl={data.createObjectUrl}
                              compact={true}
                            />
                          </div>
                        </div>
                      )
                  )}
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

        {/* Input Value Dialog */}
        <Dialog
          open={selectedInput !== null && !readonly}
          onOpenChange={() => selectedInput && !readonly && handleDialogClose()}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Parameter</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedInput && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="input-value"
                      className="text-sm font-medium"
                    >
                      {selectedInput.name}
                    </Label>
                    <span className="text-xs text-neutral-500">
                      {selectedInput.type}
                    </span>
                  </div>

                  <div className="relative">
                    {selectedInput.type === "boolean" ? (
                      <div className="flex gap-2">
                        <Button
                          variant={
                            inputValue === "true" ? "default" : "outline"
                          }
                          onClick={() => handleInputChange("true")}
                          className="flex-1"
                          disabled={readonly}
                        >
                          True
                        </Button>
                        <Button
                          variant={
                            inputValue === "false" ? "default" : "outline"
                          }
                          onClick={() => handleInputChange("false")}
                          className="flex-1"
                          disabled={readonly}
                        >
                          False
                        </Button>
                      </div>
                    ) : selectedInput.type === "number" ? (
                      <div className="relative">
                        <Input
                          id="input-value"
                          type="number"
                          value={inputValue}
                          onChange={(e) => handleInputChange(e.target.value)}
                          placeholder="Enter number value"
                          disabled={readonly}
                        />
                        {inputValue && !readonly && (
                          <button
                            onClick={handleClearValue}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                            aria-label="Clear value"
                          >
                            <XCircleIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ) : selectedInput.type === "string" ? (
                      <div className="relative">
                        <Textarea
                          id="input-value"
                          value={inputValue}
                          onChange={(e) => handleInputChange(e.target.value)}
                          placeholder="Enter text value"
                          className="min-h-[100px] resize-y"
                          disabled={readonly}
                        />
                        {inputValue && !readonly && (
                          <button
                            onClick={handleClearValue}
                            className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-600"
                            aria-label="Clear value"
                          >
                            <XCircleIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="relative">
                        <Input
                          id="input-value"
                          value={inputValue}
                          onChange={(e) => handleInputChange(e.target.value)}
                          placeholder="Enter text value"
                          disabled={readonly}
                        />
                        {inputValue && !readonly && (
                          <button
                            onClick={handleClearValue}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                            aria-label="Clear value"
                          >
                            <XCircleIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleDialogClose}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Label Edit Dialog */}
        <Dialog
          open={isEditingName && !readonly}
          onOpenChange={(open) => !open && !readonly && setIsEditingName(false)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Node Name</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="label-value" className="text-sm font-medium">
                    Node Label
                  </Label>
                  <span className="text-xs text-neutral-500">string</span>
                </div>
                <Input
                  id="label-value"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  placeholder="Enter node name"
                  disabled={readonly}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditingName(false)}>
                Cancel
              </Button>
              <Button onClick={handleNameSave} disabled={readonly}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    );
  }
);

WorkflowNode.displayName = "WorkflowNode";
