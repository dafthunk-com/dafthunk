import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { WorkflowNodeInspectorProps } from "./workflow-types";
import { useState, useEffect } from "react";
import { WorkflowOutputRenderer } from "./workflow-output-renderer";
import { Parameter } from "./workflow-node";
import {
  useWorkflow,
  updateNodeInput,
  updateNodeName,
  convertValueByType,
  clearNodeInput,
} from "./workflow-context";
import { XCircleIcon, EyeIcon, EyeOffIcon } from "lucide-react";

export function WorkflowNodeInspector({
  node,
  onNodeUpdate,
}: WorkflowNodeInspectorProps) {
  // Here we get the update functions from context, but still use the onNodeUpdate
  // prop for backward compatibility and to keep the existing architecture
  const { updateNodeData: contextUpdateNodeData } = useWorkflow();

  // Prefer the context function but fall back to the prop if needed
  const updateNodeData = onNodeUpdate || contextUpdateNodeData;

  // Create local state to immediately reflect changes in the UI
  const [localName, setLocalName] = useState<string>(node?.data.name || "");
  const [localInputs, setLocalInputs] = useState<Parameter[]>(
    node?.data.inputs || []
  );
  const [localOutputs, setLocalOutputs] = useState<Parameter[]>(
    node?.data.outputs || []
  );

  // Update local state when node changes
  useEffect(() => {
    if (!node) return;

    console.log(`Node inspector updating for node ${node.id}:`, node.data);
    setLocalName(node.data.name);
    setLocalInputs(node.data.inputs);
    setLocalOutputs(node.data.outputs);
  }, [node]);

  // We no longer need to listen for node update events since we're using the context

  if (!node) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    // Update local state immediately
    setLocalName(newName);

    // Update the node using the common utility
    updateNodeName(node.id, newName, updateNodeData);
  };

  const handleInputValueChange = (inputId: string, value: string) => {
    if (!updateNodeData) return;

    const typedValue = convertValueByType(
      value,
      localInputs.find((i) => i.id === inputId)?.type || "string"
    );

    // Use the utility function to update inputs directly
    const updatedInputs = updateNodeInput(
      node.id,
      inputId,
      typedValue,
      localInputs,
      updateNodeData
    );

    // Update local state as well for immediate feedback
    setLocalInputs(updatedInputs);
  };

  const handleClearValue = (inputId: string) => {
    if (!updateNodeData) return;

    // Use the utility function for consistent updates
    const updatedInputs = clearNodeInput(
      node.id,
      inputId,
      localInputs,
      updateNodeData
    );

    // Update local state as well for immediate feedback
    setLocalInputs(updatedInputs);
  };

  const handleSliderChange = (inputId: string, values: number[]) => {
    if (!updateNodeData || !values.length) return;

    const value = values[0];

    // Use the utility function for consistent updates
    const updatedInputs = updateNodeInput(
      node.id,
      inputId,
      value,
      localInputs,
      updateNodeData
    );

    // Update local state as well for immediate feedback
    setLocalInputs(updatedInputs);
  };

  const handleToggleVisibility = (inputId: string) => {
    if (!updateNodeData) return;

    const updatedInputs = localInputs.map((input) => {
      if (input.id === inputId) {
        return {
          ...input,
          hidden: !input.hidden,
        };
      }
      return input;
    });

    // Update the node data
    updateNodeData(node.id, {
      ...node.data,
      inputs: updatedInputs,
    });

    // Update local state
    setLocalInputs(updatedInputs);
  };

  // Check if the node is a slider node
  const isSliderNode =
    node.data.nodeType === "slider" || node.type === "slider";

  // Find min, max, step, and value for slider nodes
  const getSliderConfig = () => {
    // Find min, max, step values from node inputs
    const min = localInputs.find((i) => i.id === "min")?.value || 0;
    const max = localInputs.find((i) => i.id === "max")?.value || 100;
    const step = localInputs.find((i) => i.id === "step")?.value || 1;
    const value = localInputs.find((i) => i.id === "value")?.value;

    return {
      min: typeof min === "number" ? min : 0,
      max: typeof max === "number" ? max : 100,
      step: typeof step === "number" ? step : 1,
      value: typeof value === "number" ? value : min,
    };
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Node Properties</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="text-sm">{node.data.nodeType || node.type}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="node-name">Name</Label>
            <Input
              id="node-name"
              value={localName}
              onChange={handleNameChange}
            />
          </div>

          {/* Slider for slider nodes */}
          {isSliderNode && (
            <div className="space-y-2">
              <Label>Widget</Label>
              <div className="space-y-2">
                <Slider
                  min={getSliderConfig().min}
                  max={getSliderConfig().max}
                  step={getSliderConfig().step}
                  value={[getSliderConfig().value]}
                  onValueChange={(values) =>
                    handleSliderChange("value", values)
                  }
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{getSliderConfig().min}</span>
                  <span>Value: {getSliderConfig().value}</span>
                  <span>{getSliderConfig().max}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Inputs</Label>
            <div className="space-y-2">
              {localInputs.map((input) => (
                <div key={input.id} className="text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{input.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{input.type}</span>
                  </div>

                  {input.type === "string" ? (
                    // Render textarea for string inputs
                    <div className="relative">
                      <Textarea
                        placeholder={`Enter ${input.type} value`}
                        value={
                          input.value !== undefined ? String(input.value) : ""
                        }
                        onChange={(e) =>
                          handleInputValueChange(input.id, e.target.value)
                        }
                        className="text-sm min-h-[80px] resize-y pr-16"
                      />
                      <div className="absolute right-2 top-2 flex items-center gap-2">
                        {input.value !== undefined && (
                          <button
                            onClick={() => handleClearValue(input.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label={`Clear ${input.name} value`}
                          >
                            <XCircleIcon className="h-4 w-4" />
                          </button>
                        )}
                        <Toggle
                          size="sm"
                          pressed={input.hidden}
                          onPressedChange={() => handleToggleVisibility(input.id)}
                          aria-label={`Toggle visibility for ${input.name}`}
                          className="bg-transparent data-[state=on]:bg-transparent hover:bg-transparent data-[state=on]:text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {input.hidden ? (
                            <EyeOffIcon className="h-3 w-3" />
                          ) : (
                            <EyeIcon className="h-3 w-3" />
                          )}
                        </Toggle>
                      </div>
                    </div>
                  ) : (
                    // Regular input for other inputs
                    <div className="relative">
                      <Input
                        placeholder={`Enter ${input.type} value`}
                        value={
                          input.value !== undefined ? String(input.value) : ""
                        }
                        onChange={(e) =>
                          handleInputValueChange(input.id, e.target.value)
                        }
                        className="text-sm h-8 pr-16"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {input.value !== undefined && (
                          <button
                            onClick={() => handleClearValue(input.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label={`Clear ${input.name} value`}
                          >
                            <XCircleIcon className="h-4 w-4" />
                          </button>
                        )}
                        <Toggle
                          size="sm"
                          pressed={input.hidden}
                          onPressedChange={() => handleToggleVisibility(input.id)}
                          aria-label={`Toggle visibility for ${input.name}`}
                          className="bg-transparent data-[state=on]:bg-transparent hover:bg-transparent data-[state=on]:text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {input.hidden ? (
                            <EyeOffIcon className="h-3 w-3" />
                          ) : (
                            <EyeIcon className="h-3 w-3" />
                          )}
                        </Toggle>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {localInputs.length === 0 && (
                <div className="text-sm text-gray-500">No inputs</div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Outputs</Label>
            <div className="space-y-2">
              {localOutputs.map((output) => (
                <div key={output.id} className="text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span>{output.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">
                        {output.type}
                      </span>
                    </div>
                  </div>
                  <WorkflowOutputRenderer output={output} />
                </div>
              ))}
              {localOutputs.length === 0 && (
                <div className="text-sm text-gray-500">No outputs</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
