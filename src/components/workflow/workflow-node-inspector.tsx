import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { WorkflowNodeInspectorProps } from "./workflow-types";
import { useState, useEffect } from "react";
import { WorkflowOutputRenderer } from "./workflow-output-renderer";

export function WorkflowNodeInspector({
  node,
  onNodeUpdate,
}: WorkflowNodeInspectorProps) {
  // Create local state to immediately reflect changes in the UI
  const [localName, setLocalName] = useState<string>(node?.data.name || "");
  const [localInputs, setLocalInputs] = useState<Record<string, any>>(
    node?.data.inputs || {}
  );
  const [localOutputs, setLocalOutputs] = useState<Record<string, any>>(
    node?.data.outputs || {}
  );

  // Update local state when node changes
  useEffect(() => {
    if (!node) return;

    console.log(`Node inspector updating for node ${node.id}:`, node.data);
    setLocalName(node.data.name);
    setLocalInputs(node.data.inputs);
    setLocalOutputs(node.data.outputs);
  }, [node]);

  if (!node) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    // Update local state immediately
    setLocalName(newName);

    // Propagate change to parent component
    if (onNodeUpdate) {
      onNodeUpdate(node.id, { name: newName });
    }
  };

  const handleInputValueChange = (inputId: string, value: string) => {
    if (!onNodeUpdate) return;

    // Create a new inputs array with the updated value
    const updatedInputs = localInputs.map((input) => {
      if (input.id === inputId) {
        return { ...input, value: convertValueByType(value, input.type) };
      }
      return input;
    });

    // Update local state immediately
    setLocalInputs(updatedInputs);

    // Propagate change to parent component
    onNodeUpdate(node.id, { inputs: updatedInputs });
  };

  const handleSliderChange = (inputId: string, values: number[]) => {
    if (!onNodeUpdate || !values.length) return;

    const value = values[0];

    // Create a new inputs array with the updated value
    const updatedInputs = localInputs.map((input) => {
      if (input.id === inputId) {
        return { ...input, value };
      }
      return input;
    });

    // Update local state immediately
    setLocalInputs(updatedInputs);

    // Propagate change to parent component
    onNodeUpdate(node.id, { inputs: updatedInputs });

    // Special handling for slider node: trigger an immediate save
    // This ensures the value persists across page loads
    try {
      // This will trigger an API/DB save in the component that manages the workflow
      const workflowEvent = new CustomEvent("workflow:save", {
        detail: { nodeId: node.id, type: "slider-value-change", value },
      });
      document.dispatchEvent(workflowEvent);
    } catch (e) {
      console.error("Error dispatching workflow save event:", e);
    }
  };

  // Convert string values to the appropriate type
  const convertValueByType = (value: string, type: string) => {
    if (type === "number") {
      const num = parseFloat(value);
      return isNaN(num) ? undefined : num;
    }
    if (type === "boolean") {
      return value.toLowerCase() === "true";
    }
    return value; // Default to string
  };

  // Check if the node is a slider node
  const isSliderNode = node.data.type === "slider" || node.type === "slider";

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
            <div className="text-sm">{node.data.type}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="node-name">Name</Label>
            <Input
              id="node-name"
              value={localName}
              onChange={handleNameChange}
            />
          </div>

          <div className="space-y-2">
            <Label>Inputs</Label>
            <div className="space-y-2">
              {localInputs.map((input) => (
                <div key={input.id} className="text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span>{input.name}</span>
                    <span className="text-xs text-gray-500">{input.type}</span>
                  </div>

                  {isSliderNode && input.id === "value" ? (
                    // Render slider for value input in slider nodes
                    <div className="space-y-2">
                      <Slider
                        min={getSliderConfig().min}
                        max={getSliderConfig().max}
                        step={getSliderConfig().step}
                        value={[getSliderConfig().value]}
                        onValueChange={(values) =>
                          handleSliderChange(input.id, values)
                        }
                        className="py-4"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{getSliderConfig().min}</span>
                        <span>Value: {getSliderConfig().value}</span>
                        <span>{getSliderConfig().max}</span>
                      </div>
                    </div>
                  ) : (
                    // Regular input for other inputs
                    <Input
                      placeholder={`Enter ${input.type} value`}
                      value={
                        input.value !== undefined ? String(input.value) : ""
                      }
                      onChange={(e) =>
                        handleInputValueChange(input.id, e.target.value)
                      }
                      className="text-sm h-8"
                    />
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
