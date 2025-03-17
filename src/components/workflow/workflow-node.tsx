import { memo, useState } from "react";
import { Handle, Position } from "reactflow";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { WorkflowOutputRenderer } from "./workflow-output-renderer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface Parameter {
  id: string;
  type: string;
  label: string;
  value?: any;
  isConnected?: boolean;
}

type NodeExecutionState = "idle" | "executing" | "completed" | "error";

export interface WorkflowNodeData {
  label: string;
  inputs: Parameter[];
  outputs: Parameter[];
  error?: string | null;
  executionState: NodeExecutionState;
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
  const label = type.charAt(0).toUpperCase();
  
  const handleClick = (e: React.MouseEvent) => {
    if (position === Position.Left && parameter && onInputClick) {
      e.stopPropagation();
      onInputClick(parameter);
    }
  };
  
  // Check if the parameter has a value set (only for input parameters)
  const hasValue = position === Position.Left && parameter && parameter.value !== undefined;
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
            "bg-gray-300 text-gray-800 hover:bg-gray-400": !isConnected && hasValue,
            "bg-gray-100 text-gray-600 hover:bg-gray-200": !isConnected && !hasValue,
          }
        )}
        onClick={handleClick}
      >
        {label}
      </span>
    </div>
  );
};

export const WorkflowNode = memo(
  ({ data, selected, id }: { data: WorkflowNodeData; selected?: boolean; id: string }) => {
    const [showOutputs, setShowOutputs] = useState(false);
    const hasOutputValues = data.outputs.some(
      (output) => output.value !== undefined
    );
    const [selectedInput, setSelectedInput] = useState<Parameter | null>(null);
    const [inputValue, setInputValue] = useState<string>("");
    
    const handleInputClick = (input: Parameter) => {
      setSelectedInput(input);
      setInputValue(input.value !== undefined ? String(input.value) : "");
    };
    
    const handleInputSave = () => {
      if (!selectedInput) return;
      
      // Convert value based on parameter type
      let typedValue: any = inputValue;
      if (selectedInput.type === "number") {
        typedValue = parseFloat(inputValue);
        if (isNaN(typedValue)) typedValue = 0;
      } else if (selectedInput.type === "boolean") {
        typedValue = inputValue.toLowerCase() === "true";
      }
      
      // Dispatch a custom event to update the node data
      const updateEvent = new CustomEvent("workflow:node:update", {
        detail: {
          nodeId: id,
          inputId: selectedInput.id,
          value: typedValue
        },
      });
      document.dispatchEvent(updateEvent);
      
      setSelectedInput(null);
    };
    
    const handleDialogClose = () => {
      setSelectedInput(null);
    };

    return (
      <>
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
          <div className="p-1 text-center">
            <h3 className="m-0 text-xs font-medium">{data.label}</h3>
          </div>

          {/* Parameters */}
          <div className="px-1 pb-1 grid grid-cols-2 justify-between gap-2.5">
            {/* Input Parameters */}
            <div className="flex flex-col gap-1 flex-1">
              {data.inputs.map((input, index) => (
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
                  <p className="overflow-hidden text-ellipsis">{input.label}</p>
                </div>
              ))}
            </div>

            {/* Output Parameters */}
            <div className="flex flex-col gap-1 flex-1 items-end">
              {data.outputs.map((output, index) => (
                <div
                  key={`output-${output.id}-${index}`}
                  className="flex items-center gap-1 text-xs relative"
                >
                  <p className="overflow-hidden text-ellipsis">{output.label}</p>
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
            <div className="px-2 py-1 border-t border-gray-200 space-y-2">
              {data.outputs.map(
                (output, index) =>
                  output.value !== undefined && (
                    <div
                      key={`output-value-${output.id}-${index}`}
                      className="space-y-1"
                    >
                      <div className="text-xs font-medium">{output.label}</div>
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
        <Dialog open={selectedInput !== null} onOpenChange={() => selectedInput && handleDialogClose()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Set Input Value for {selectedInput?.label}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedInput && (
                <div className="space-y-2">
                  <Label htmlFor="input-value">
                    {selectedInput.label} <span className="text-xs text-gray-500">({selectedInput.type})</span>
                  </Label>
                  
                  {selectedInput.type === "boolean" ? (
                    <div className="flex gap-2">
                      <Button
                        variant={inputValue === "true" ? "default" : "outline"}
                        onClick={() => setInputValue("true")}
                        className="flex-1"
                      >
                        True
                      </Button>
                      <Button
                        variant={inputValue === "false" ? "default" : "outline"}
                        onClick={() => setInputValue("false")}
                        className="flex-1"
                      >
                        False
                      </Button>
                    </div>
                  ) : selectedInput.type === "number" ? (
                    <Input
                      id="input-value"
                      type="number"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Enter number value"
                    />
                  ) : (
                    <Input
                      id="input-value"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Enter text value"
                    />
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleDialogClose}>Cancel</Button>
              <Button onClick={handleInputSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);

WorkflowNode.displayName = "WorkflowNode";
