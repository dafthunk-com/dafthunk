import { memo, useState, useEffect } from "react";
import { Handle, Position } from "reactflow";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, PencilIcon, XCircleIcon } from "lucide-react";
import { WorkflowOutputRenderer } from "./workflow-output-renderer";
import { SliderWidget } from "./widgets/slider-widget";
import { RadioGroupWidget } from "./widgets/radio-group-widget";
import { TextAreaWidget } from "./widgets/text-area-widget";
import { InputTextWidget } from "./widgets/input-text-widget";
import { NumberInputWidget } from "./widgets/number-input-widget";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useWorkflow,
  updateNodeInput,
  clearNodeInput,
  updateNodeName,
  convertValueByType,
} from "./workflow-context";
import { createWidgetConfig } from "./widgets/widget-factory";

export interface Parameter {
  id: string;
  type: string;
  name: string;
  value?: any;
  isConnected?: boolean;
  hidden?: boolean;
}

type NodeExecutionState = "idle" | "executing" | "completed" | "error";

export interface WorkflowNodeData {
  name: string;
  inputs: Parameter[];
  outputs: Parameter[];
  error?: string | null;
  executionState: NodeExecutionState;
  nodeType?: string;
}

const TypeBadge = ({
  type,
  position,
  id,
  parameter,
  onInputClick,
}: {
  type: string;
  position: Position;
  id: string;
  parameter?: Parameter;
  onInputClick?: (param: Parameter) => void;
}) => {
  const name = type.charAt(0).toUpperCase();

  const handleClick = (e: React.MouseEvent) => {
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

  return (
    <div className="relative inline-flex items-center justify-center">
      <Handle
        type={position === Position.Left ? "target" : "source"}
        position={position}
        id={id}
        className="opacity-0 !w-full !h-full !bg-transparent !border-none !absolute !left-0 !top-0 !transform-none !m-0 !z-[1000]"
        isConnectableStart={position !== Position.Left}
      />
      <span
        className={cn(
          "inline-flex items-center justify-center w-5 h-5 rounded text-xs font-medium relative z-[1] cursor-pointer transition-colors",
          {
            "bg-gray-400 text-gray-900 hover:bg-gray-500": isConnected,
            "bg-gray-300 text-gray-800 hover:bg-gray-400":
              !isConnected && hasValue,
            "bg-gray-100 text-gray-600 hover:bg-gray-200":
              !isConnected && !hasValue,
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
    data: WorkflowNodeData;
    selected?: boolean;
    id: string;
  }) => {
    const { updateNodeData } = useWorkflow();
    const [showOutputs, setShowOutputs] = useState(false);
    const hasOutputValues = data.outputs.some(
      (output) => output.value !== undefined
    );
    const [selectedInput, setSelectedInput] = useState<Parameter | null>(null);
    const [inputValue, setInputValue] = useState<string>("");
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameValue, setNameValue] = useState(data.name);

    // Check if the node is a widget node
    const isSliderNode = data.nodeType === "slider";
    const isRadioGroupNode = data.nodeType === "radio-group";
    const isTextAreaNode = data.nodeType === "text-area";
    const isInputTextNode = data.nodeType === "input-text";
    const isNumberInputNode = data.nodeType === "number-input";

    // Get widget configuration
    const widgetConfig = isSliderNode || isRadioGroupNode || isTextAreaNode || isInputTextNode || isNumberInputNode
      ? createWidgetConfig(id, data.inputs, data.nodeType || "") 
      : null;

    const handleWidgetChange = (value: any) => {
      if (!updateNodeData || !widgetConfig) return;

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

    const handleInputClick = (input: Parameter) => {
      setSelectedInput(input);
      setInputValue(input.value !== undefined ? String(input.value) : "");
    };

    const handleInputChange = (value: string) => {
      if (!selectedInput) return;

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
      if (!selectedInput) return;
      clearNodeInput(id, selectedInput.id, data.inputs, updateNodeData);
      setInputValue("");
    };

    const handleDialogClose = () => {
      setSelectedInput(null);
    };

    const handleNameClick = () => {
      setIsEditingName(true);
      setNameValue(data.name);
    };

    const handleNameSave = () => {
      if (nameValue.trim() === "") return;
      updateNodeName(id, nameValue, updateNodeData);
      setIsEditingName(false);
    };

    return (
      <TooltipProvider>
        <div
          className={cn(
            "bg-white shadow-sm w-[200px] rounded-lg border-[1px] transition-colors overflow-hidden",
            {
              "border-blue-500": selected,
              "border-gray-300": !selected && data.executionState === "idle",
              "border-yellow-400": data.executionState === "executing",
              "border-green-500": data.executionState === "completed",
              "border-red-500": data.executionState === "error",
            }
          )}
        >
          {/* Header */}
          <div className="pl-2 pr-1 py-1 flex justify-between items-center border-b border-gray-200">
            <h3 className="text-xs font-medium truncate">{data.name}</h3>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleNameClick}
                    className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-100 text-blue-500 hover:bg-gray-200"
                    aria-label="Edit node label"
                  >
                    <PencilIcon className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit Label</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Widget */}
          {widgetConfig && (
            <div className="px-3 py-2 border-b border-gray-200">
              {isSliderNode && 'type' in widgetConfig && widgetConfig.type === 'slider' && (
                <SliderWidget
                  config={widgetConfig}
                  onChange={handleWidgetChange}
                  compact={true}
                />
              )}
              {isRadioGroupNode && 'type' in widgetConfig && widgetConfig.type === 'radio-group' && (
                <RadioGroupWidget
                  config={widgetConfig}
                  onChange={handleWidgetChange}
                  compact={true}
                />
              )}
              {isTextAreaNode && 'type' in widgetConfig && widgetConfig.type === 'text-area' && (
                <TextAreaWidget
                  config={widgetConfig}
                  onChange={handleWidgetChange}
                  compact={true}
                />
              )}
              {isInputTextNode && 'type' in widgetConfig && widgetConfig.type === 'input-text' && (
                <InputTextWidget
                  config={widgetConfig}
                  onChange={handleWidgetChange}
                  compact={true}
                />
              )}
              {isNumberInputNode && 'type' in widgetConfig && widgetConfig.type === 'number-input' && (
                <NumberInputWidget
                  config={widgetConfig}
                  onChange={handleWidgetChange}
                  compact={true}
                />
              )}
            </div>
          )}

          {/* Parameters */}
          <div className="px-1 py-1 grid grid-cols-2 justify-between gap-2.5">
            {/* Input Parameters */}
            <div className="flex flex-col gap-1 flex-1">
              {data.inputs.filter(input => !input.hidden).map((input, index) => (
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
                  />
                  <p className="overflow-hidden text-ellipsis">{input.name}</p>
                </div>
              ))}
            </div>

            {/* Output Parameters */}
            <div className="flex flex-col gap-1 flex-1 items-end">
              {data.outputs.filter(output => !output.hidden).map((output, index) => (
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
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Output Values Section - Always visible but disabled when no outputs */}
          <div
            className={cn(
              "px-2 py-1 border-t border-gray-200 flex items-center justify-between",
              {
                "cursor-pointer hover:bg-gray-50": hasOutputValues,
                "cursor-not-allowed opacity-60": !hasOutputValues,
              }
            )}
            onClick={() => hasOutputValues && setShowOutputs(!showOutputs)}
          >
            <span className="text-xs font-medium text-gray-600">Outputs</span>
            {hasOutputValues ? (
              showOutputs ? (
                <ChevronUp className="h-3 w-3 text-gray-500" />
              ) : (
                <ChevronDown className="h-3 w-3 text-gray-500" />
              )
            ) : (
              <ChevronDown className="h-3 w-3 text-gray-300" />
            )}
          </div>

          {hasOutputValues && showOutputs && (
            <div className="px-2 pt-1 pb-2 border-t border-gray-200 space-y-2">
              {data.outputs.map(
                (output, index) =>
                  output.value !== undefined && (
                    <div
                      key={`output-value-${output.id}-${index}`}
                      className="space-y-1"
                    >
                      <div className="text-xs font-medium">{output.name}</div>
                      <WorkflowOutputRenderer output={output} compact={true} />
                    </div>
                  )
              )}
            </div>
          )}

          {/* Error Display */}
          {data.error && (
            <div className="p-2 bg-red-50 text-red-600 text-xs border-t border-red-200">
              <p className="m-0">{data.error}</p>
            </div>
          )}
        </div>

        {/* Input Value Dialog */}
        <Dialog
          open={selectedInput !== null}
          onOpenChange={() => selectedInput && handleDialogClose()}
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
                    <span className="text-xs text-gray-500">
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
                        >
                          True
                        </Button>
                        <Button
                          variant={
                            inputValue === "false" ? "default" : "outline"
                          }
                          onClick={() => handleInputChange("false")}
                          className="flex-1"
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
                        />
                        {inputValue && (
                          <button
                            onClick={handleClearValue}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                        />
                        {inputValue && (
                          <button
                            onClick={handleClearValue}
                            className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
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
                        />
                        {inputValue && (
                          <button
                            onClick={handleClearValue}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
          open={isEditingName}
          onOpenChange={(open) => !open && setIsEditingName(false)}
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
                  <span className="text-xs text-gray-500">string</span>
                </div>
                <Input
                  id="label-value"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  placeholder="Enter node name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditingName(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleNameSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    );
  }
);

WorkflowNode.displayName = "WorkflowNode";
